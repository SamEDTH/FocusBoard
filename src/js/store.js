import { STORAGE_KEY, SETTINGS_KEY, DEFAULT, TODAY } from './constants.js';
import { uid } from './utils.js';
import { getTotalFreeMinutes, isAnyConnected, syncFocusSessions } from './services/calendar.js';
import { isSupabaseConfigured, loadBoard, saveBoard } from './services/supabase.js';

// ── Persistence ──────────────────────────────────────────────────────────────

function loadData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : DEFAULT;
  } catch {
    return DEFAULT;
  }
}

function saveData(data) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch { /* quota exceeded */ }
}

function loadSettings() {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    return raw ? JSON.parse(raw) : { theme: 'light', useSystemTheme: false, sidebarCollapsed: false, workStart: '09:30', workEnd: '17:30', focusBuffer: 15, focusMinBlock: 30, followUpDays: 5 };
  } catch {
    return { theme: 'light', useSystemTheme: false, sidebarCollapsed: false, workStart: '09:30', workEnd: '17:30', focusBuffer: 15, focusMinBlock: 30, followUpDays: 5 };
  }
}

function saveSettings(settings) {
  try { localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)); } catch { /* quota exceeded */ }
}

function persistSettings() {
  saveSettings({ theme: S.theme, useSystemTheme: S.useSystemTheme, sidebarCollapsed: S.sidebarCollapsed, workStart: S.workStart, workEnd: S.workEnd, focusBuffer: S.focusBuffer, focusMinBlock: S.focusMinBlock, followUpDays: S.followUpDays });
}

export function updateFocusDefaults(buffer, minBlock) {
  S.focusBuffer   = buffer;
  S.focusMinBlock = minBlock;
  persistSettings();
}

export function updateFollowUpDays(days) {
  S.followUpDays = days;
  persistSettings();
}

// ── Render callback (avoids circular import) ──────────────────────────────────

let renderFn = () => {};
export function setRenderFn(fn) { renderFn = fn; }

// ── State ─────────────────────────────────────────────────────────────────────

const savedSettings = loadSettings();

// ── System theme detection ────────────────────────────────────────────────────

const systemMediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

function applySystemTheme() {
  const theme = systemMediaQuery.matches ? 'dark' : 'light';
  S.theme = theme;
  document.body.className = theme;
  renderFn();
}

// ── State ─────────────────────────────────────────────────────────────────────

export const S = {
  data: loadData(),
  panel: 'work',
  view: 'dashboard',
  activeCat: null,
  filter: 'all',
  showAddItem: false,
  showAddCat: false,
  showSettings: false,
  expandedCards: {},
  moreOpenCards: {},
  editingCards: {},
  editingCat: null,
  stageInputCards: {},
  addItemForm: { type: 'task', nature: 'action', title: '', categoryId: '', priority: 5, dueDate: '', timeNeeded: 60, notes: '', hasDueDate: false, waitingFrom: '', targetReturnDate: '', chaseDate: '', recurrence: '' },
  searchQuery: '',
  completedOpen: false,
  workloadPeriod: 'week',
  workStart: savedSettings.workStart || '09:30',
  workEnd:   savedSettings.workEnd   || '17:30',
  theme: savedSettings.useSystemTheme
    ? (systemMediaQuery.matches ? 'dark' : 'light')
    : (savedSettings.theme || 'light'),
  useSystemTheme: savedSettings.useSystemTheme || false,
  sidebarCollapsed: savedSettings.sidebarCollapsed || false,
  dragId: null,
  calWeekStart: null,
  dashFilter: null,   // 'overdue' | 'dueToday' | 'upcoming' | 'chaseDue' | 'awaitingReply' | 'completed' | null
  dashTab: 'all',     // 'all' | 'today' | 'week'
  catTab: 'tasks',    // 'tasks' | 'bible' | 'budget' | 'invoices'
  focusBuffer:   savedSettings.focusBuffer   ?? 15,
  focusMinBlock: savedSettings.focusMinBlock ?? 30,
  followUpDays:  savedSettings.followUpDays  ?? 5,
  calFreeMinutes: null, // total free working-hour minutes today (null = not loaded / no calendar)
  calError: null,       // non-null when calendar token refresh failed — prompts reconnect
  focusSyncMap: {},     // taskId → [{ status: 'ok'|'cancelled'|'rescheduled'|'past' }]
  // Supabase auth + sync
  userId:    null,  // logged-in user id; null = not signed in or Supabase not configured
  loading:   false, // true while fetching board data from Supabase on sign-in
  syncError: null,  // non-null string when the last Supabase write failed
};

// Start listening if system theme was previously enabled
if (S.useSystemTheme) systemMediaQuery.addEventListener('change', applySystemTheme);

// ── Calendar free time ────────────────────────────────────────────────────────

/** Fetch today's total free working-hour minutes from the connected calendar. */
export async function loadCalFreeMinutes() {
  if (!isAnyConnected()) {
    if (S.calFreeMinutes !== null) { S.calFreeMinutes = null; renderFn(); }
    return;
  }
  const d = new Date();
  const dateStr = [d.getFullYear(), String(d.getMonth() + 1).padStart(2, '0'), String(d.getDate()).padStart(2, '0')].join('-');
  try {
    S.calFreeMinutes = await getTotalFreeMinutes(dateStr, S.workStart, S.workEnd);
    if (S.calError) S.calError = null;
    renderFn();
  } catch (err) {
    S.calFreeMinutes = null;
    const msg = err?.message || '';
    // Token refresh failures mean the user needs to reconnect — surface it
    if (msg.includes('not connected') || msg.includes('expired') || msg.includes('refresh')) {
      S.calError = 'Calendar disconnected — reconnect in Settings';
      renderFn();
    }
  }
}

/**
 * Sync focus-block sessions against the connected calendar.
 * Runs silently in the background; updates S.focusSyncMap and re-renders.
 * Debounced — rapid calls (e.g. tab focus + app load) only fire once.
 */
let _focusSyncTimer = null;
export function runFocusSync(delayMs = 2000) {
  clearTimeout(_focusSyncTimer);
  _focusSyncTimer = setTimeout(async () => {
    if (!isAnyConnected()) return;
    // Collect all top-level tasks and workflow sub-tasks across both panels
    const allTasks = [];
    for (const panel of ['work', 'life']) {
      for (const item of (S.data[panel]?.items || [])) {
        if (item.focusSessions?.length || item.focusBlock) allTasks.push(item);
        for (const sub of (item.tasks || [])) {
          if (sub.focusSessions?.length || sub.focusBlock) allTasks.push(sub);
        }
      }
    }
    if (!allTasks.length) return;
    try {
      const map = await syncFocusSessions(allTasks);
      if (map) { S.focusSyncMap = map; renderFn(); }
    } catch { /* sync errors are non-critical */ }
  }, delayMs);
}

// ── Core state updaters ───────────────────────────────────────────────────────

export function set(patch) { Object.assign(S, patch); renderFn(); }

// Debounced Supabase save — waits 1 s after last change before writing
let _sbSaveTimer = null;
function scheduleSbSave(data) {
  if (!isSupabaseConfigured() || !S.userId) return;
  clearTimeout(_sbSaveTimer);
  _sbSaveTimer = setTimeout(async () => {
    try {
      await saveBoard(S.userId, data);
      if (S.syncError) { S.syncError = null; renderFn(); }
    } catch (e) {
      S.syncError = e.message || 'Sync failed — changes saved locally';
      renderFn();
    }
  }, 1000);
}

export function upd(newData) {
  S.data = newData;
  saveData(newData);      // instant localStorage write (cache)
  scheduleSbSave(newData); // async Supabase write (cross-device sync)
  renderFn();
}

// ── Supabase initialisation ───────────────────────────────────────────────────

/**
 * Called by render.js when the user signs in.
 * Loads their board from Supabase; migrates any existing localStorage data
 * for new users so nothing is lost on first sign-in.
 */
export async function initFromSupabase(userId) {
  S.userId  = userId;
  S.loading = true;
  renderFn();

  // Snapshot the data reference — if it changes during the fetch, a local
  // mutation happened while we were loading; in that case we preserve the
  // user's change rather than overwriting with the remote version.
  const dataAtStart = S.data;

  try {
    // Timeout safety: if Supabase hangs for >10 s, unblock the UI anyway
    const withTimeout = (promise, ms) =>
      Promise.race([promise, new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), ms))]);

    const remote = await withTimeout(loadBoard(userId), 10_000);

    if (S.data !== dataAtStart) {
      // User mutated data while we were loading — their version is authoritative
      saveBoard(userId, S.data).catch(e => console.warn('[supabase] post-init save failed:', e.message));
    } else if (remote) {
      // Existing Supabase data — use it and refresh the local cache
      S.data = remote;
      saveData(remote);
    } else {
      // New user — migrate localStorage data if present, otherwise DEFAULT applies
      const local = (() => {
        try { const r = localStorage.getItem(STORAGE_KEY); return r ? JSON.parse(r) : null; }
        catch { return null; }
      })();
      if (local) {
        S.data = local;
        saveBoard(userId, local).catch(e => console.warn('[supabase] initial save failed:', e.message));
      }
      // If neither, S.data is already DEFAULT from startup
    }
  } catch (err) {
    console.warn('[supabase] initFromSupabase failed, falling back to local data:', err.message);
    // Fall back to whatever is in localStorage / DEFAULT
    const local = (() => {
      try { const r = localStorage.getItem(STORAGE_KEY); return r ? JSON.parse(r) : null; }
      catch { return null; }
    })();
    if (local && S.data === dataAtStart) S.data = local;
  }

  S.loading = false;
  renderFn();
}

// ── Selectors ─────────────────────────────────────────────────────────────────

export function getPanelData() { return S.data[S.panel]; }
export function getPanelColor() { return S.panel === 'work' ? '#378ADD' : '#1D9E75'; }
export function getActiveCatName() {
  const p = getPanelData();
  if (!p || !S.activeCat) return '';
  return p.categories.find(c => c.id === S.activeCat)?.name || '';
}

export function getFilteredItems() {
  const p = getPanelData();
  if (!p) return [];
  let items = S.view === 'category' && S.activeCat
    ? p.items.filter(i => i.categoryId === S.activeCat)
    : p.items;
  if (S.filter === 'tasks') items = items.filter(i => i.type === 'task');
  else if (S.filter === 'workflows') items = items.filter(i => i.type === 'workflow');
  else if (S.filter === 'awaiting') items = items.filter(i => i.stage === 'awaiting');
  else if (S.filter === 'unscheduled') items = items.filter(i => !i.focusBlock && !i.done);
  return items;
}

export function getGroupedItems() {
  const p = getPanelData();
  if (!p) return [];
  return p.categories
    .map(cat => ({ cat, items: p.items.filter(i => i.categoryId === cat.id) }))
    .filter(g => g.items.length > 0);
}

// ── Navigation ────────────────────────────────────────────────────────────────

export function switchPanel(panel) {
  set({ panel, view: 'dashboard', activeCat: null, filter: 'all', showAddItem: false, showAddCat: false, dashFilter: null, dashTab: 'all' });
}

export function gotoCategory(id) {
  set({ view: 'category', activeCat: id, filter: 'all', showAddItem: false, showAddCat: false, dashFilter: null, catTab: 'tasks' });
}

export function gotoDashboard() {
  set({ view: 'dashboard', activeCat: null, filter: 'all', showAddItem: false, showAddCat: false, dashFilter: null, dashTab: 'all' });
}

export function gotoWorkload() {
  set({ view: 'workload', activeCat: null, showAddItem: false, showAddCat: false, dashFilter: null });
}

// ── UI toggles ────────────────────────────────────────────────────────────────

export function toggleTheme() {
  const theme = S.theme === 'light' ? 'dark' : 'light';
  S.theme = theme;
  document.body.className = theme;
  persistSettings();
  renderFn();
}

export function toggleSystemTheme() {
  S.useSystemTheme = !S.useSystemTheme;
  if (S.useSystemTheme) {
    systemMediaQuery.addEventListener('change', applySystemTheme);
    applySystemTheme();
  } else {
    systemMediaQuery.removeEventListener('change', applySystemTheme);
  }
  persistSettings();
  renderFn();
}

export function updateWorkingHours(start, end) {
  S.workStart = start;
  S.workEnd   = end;
  persistSettings();
  loadCalFreeMinutes(); // re-calculate with new hours
}

export function toggleSidebar() {
  S.sidebarCollapsed = !S.sidebarCollapsed;
  persistSettings();
  renderFn();
}

export function toggleCard(id) {
  const ec = { ...S.expandedCards };
  ec[id] = !ec[id];
  S.expandedCards = ec;
  // Direct DOM toggle so CSS transitions fire on the existing element
  const card = document.querySelector(`[data-id="${id}"]`);
  if (card) {
    card.classList.toggle('expanded', !!ec[id]);
    card.querySelector('.expand-btn')?.classList.toggle('open', !!ec[id]);
    card.querySelector('.expanded-body')?.classList.toggle('open', !!ec[id]);
  }
}

export function toggleMore(id) {
  const mc = { ...S.moreOpenCards };
  mc[id] = !mc[id];
  set({ moreOpenCards: mc });
}

// ── Inline editing ────────────────────────────────────────────────────────────

export function startEdit(id) {
  const item = getPanelData().items.find(i => i.id === id);
  if (!item) return;
  const ec = { ...S.editingCards };
  ec[id] = item.type === 'workflow'
    ? { title: item.title, notes: item.notes || '' }
    : { title: item.title, priority: item.priority, dueDate: item.dueDate || '', timeNeeded: item.timeNeeded || 60, notes: item.notes || '', recurrence: item.recurrence || '' };
  const exp = { ...S.expandedCards };
  exp[id] = true;
  set({ editingCards: ec, expandedCards: exp });
}

export function cancelEdit(id) {
  const ec = { ...S.editingCards };
  delete ec[id];
  set({ editingCards: ec });
}

export function saveEdit(id) {
  const edits = S.editingCards[id];
  if (!edits) return;
  const newData = JSON.parse(JSON.stringify(S.data));
  const items = newData[S.panel].items;
  const idx = items.findIndex(i => i.id === id);
  if (idx >= 0) Object.assign(items[idx], edits);
  const ec = { ...S.editingCards };
  delete ec[id];
  S.editingCards = ec;
  upd(newData);
}

// ── Item actions ──────────────────────────────────────────────────────────────

function nextRecurringDueDate(dueDate, freq) {
  const base = dueDate ? new Date(dueDate) : new Date();
  base.setHours(0, 0, 0, 0);
  const today = new Date(); today.setHours(0, 0, 0, 0);
  // Advance by the interval until the next date is in the future
  do {
    if (freq === 'daily')   base.setDate(base.getDate() + 1);
    if (freq === 'weekly')  base.setDate(base.getDate() + 7);
    if (freq === 'monthly') base.setMonth(base.getMonth() + 1);
    if (freq === 'yearly')  base.setFullYear(base.getFullYear() + 1);
  } while (base <= today);
  return base.toISOString().split('T')[0];
}

export function toggleDone(id) {
  const newData = JSON.parse(JSON.stringify(S.data));
  const items = newData[S.panel].items;
  const idx = items.findIndex(i => i.id === id);
  if (idx >= 0) {
    items[idx].done = !items[idx].done;
    items[idx].doneAt   = items[idx].done
      ? new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
      : undefined;
    items[idx].doneDate = items[idx].done ? TODAY : undefined;
    // Spawn the next occurrence when completing a recurring task
    if (items[idx].done && items[idx].recurrence) {
      const nextDue = nextRecurringDueDate(items[idx].dueDate, items[idx].recurrence);
      const alreadyExists = items.some(i =>
        !i.done && i.title === items[idx].title &&
        i.recurrence === items[idx].recurrence && i.dueDate === nextDue,
      );
      if (!alreadyExists) {
        const next = JSON.parse(JSON.stringify(items[idx]));
        next.id            = uid();
        next.done          = false;
        next.doneAt        = undefined;
        next.doneDate      = undefined;
        next.dueDate       = nextDue;
        next.focusSessions = [];
        items.push(next);
      }
    }
  }
  upd(newData);
}

// Workflow task actions and legacy subtask stubs have moved to workflowActions.js

export function addFocusSession(id, session) {
  const newData = JSON.parse(JSON.stringify(S.data));
  const items = newData[S.panel].items;
  const idx = items.findIndex(i => i.id === id);
  if (idx < 0) return;
  const item = items[idx];
  // Migrate legacy focusBlock into the sessions array
  if (!item.focusSessions) {
    item.focusSessions = item.focusBlock ? [item.focusBlock] : [];
    delete item.focusBlock;
  }
  item.focusSessions.push(session);
  upd(newData);
}

export function removeFocusSession(id, idx) {
  const newData = JSON.parse(JSON.stringify(S.data));
  const items = newData[S.panel].items;
  const itemIdx = items.findIndex(i => i.id === id);
  if (itemIdx < 0) return;
  const item = items[itemIdx];
  if (!item.focusSessions) return;
  item.focusSessions.splice(idx, 1);
  upd(newData);
}

export function updateItem(id, changes) {
  const newData = JSON.parse(JSON.stringify(S.data));
  const items = newData[S.panel].items;
  const idx = items.findIndex(i => i.id === id);
  if (idx >= 0) Object.assign(items[idx], changes);
  upd(newData);
}

export function addStage(id, label) {
  const newData = JSON.parse(JSON.stringify(S.data));
  const items = newData[S.panel].items;
  const idx = items.findIndex(i => i.id === id);
  if (idx >= 0) {
    if (!items[idx].stages) items[idx].stages = [];
    items[idx].stages.push({ id: uid(), label, date: TODAY });
  }
  // Close the stage input without a separate render cycle
  const si = { ...S.stageInputCards };
  delete si[id];
  S.stageInputCards = si;
  upd(newData);
}

export function addItem(form) {
  const newData = JSON.parse(JSON.stringify(S.data));
  const isWorkflow = form.type === 'workflow';
  // Generate the id upfront so we can expand the card before the render fires
  const newId = uid();
  newData[S.panel].items.push({
    ...form,
    id: newId,
    done: false,
    // New workflow model
    tasks: isWorkflow ? [] : undefined,
    hasDueDate: isWorkflow ? (form.hasDueDate || false) : undefined,
    dueDate: isWorkflow ? (form.hasDueDate ? form.dueDate : '') : form.dueDate,
    // Clear old workflow fields
    stages: undefined,
    stage: undefined,
    stageSentDate: undefined,
    followUpDays: undefined,
  });
  const firstCatId = S.activeCat || getPanelData().categories[0]?.id || '';
  // Auto-expand new workflows so the user lands straight on the task list
  if (isWorkflow) S.expandedCards = { ...S.expandedCards, [newId]: true };
  set({ showAddItem: false, dashFilter: null, addItemForm: { type: 'task', nature: 'action', title: '', categoryId: firstCatId, priority: 5, dueDate: '', timeNeeded: 60, notes: '', hasDueDate: false, waitingFrom: '', targetReturnDate: '', chaseDate: '' } });
  upd(newData);
}

export function convertItem(id) {
  const newData = JSON.parse(JSON.stringify(S.data));
  const items = newData[S.panel].items;
  const idx = items.findIndex(i => i.id === id);
  if (idx < 0) return;
  const item = items[idx];
  if (item.type === 'task') {
    item.type = 'workflow';
    if (!item.tasks) item.tasks = [];
    item.hasDueDate = !!item.dueDate;
    // Remove old workflow fields if they snuck in
    delete item.stages;
    delete item.stage;
    delete item.stageSentDate;
    delete item.followUpDays;
    delete item.subtasks;
  } else {
    item.type = 'task';
    delete item.tasks;
    delete item.hasDueDate;
  }
  upd(newData);
}

export function deleteItem(id) {
  const newData = JSON.parse(JSON.stringify(S.data));
  const items = newData[S.panel].items;
  const idx = items.findIndex(i => i.id === id);
  if (idx >= 0) items.splice(idx, 1);
  upd(newData);
}

export function renameCategory(id, name) {
  const newData = JSON.parse(JSON.stringify(S.data));
  const cats = newData[S.panel].categories;
  const idx = cats.findIndex(c => c.id === id);
  if (idx >= 0) cats[idx].name = name.trim();
  S.editingCat = null;
  upd(newData);
}

export function deleteCategory(id) {
  const newData = JSON.parse(JSON.stringify(S.data));
  const panel = newData[S.panel];
  const idx = panel.categories.findIndex(c => c.id === id);
  if (idx < 0) return;
  const remaining = panel.categories.filter(c => c.id !== id);
  if (remaining.length > 0) {
    const fallbackId = remaining[0].id;
    panel.items.forEach(item => { if (item.categoryId === id) item.categoryId = fallbackId; });
  } else {
    panel.items = panel.items.filter(i => i.categoryId !== id);
  }
  panel.categories.splice(idx, 1);
  if (S.activeCat === id) { S.view = 'dashboard'; S.activeCat = null; }
  S.editingCat = null;
  upd(newData);
}

export function resetToDefault() {
  S.data = JSON.parse(JSON.stringify(DEFAULT));
  saveData(S.data);
  scheduleSbSave(S.data);
  renderFn();
}

export function addCategory(name) {
  const newData = JSON.parse(JSON.stringify(S.data));
  newData[S.panel].categories.push({
    id: name.toLowerCase().replace(/\s+/g, '-') + '-' + Date.now(),
    name,
  });
  set({ showAddCat: false });
  upd(newData);
}

// ── Project Bible & Budget ─────────────────────────────────────────────────────

const DEFAULT_BIBLE_SECTIONS = [
  { title: 'Project Summary', cols: 3, rows: [
    { label: 'Project Name',    value: '' },
    { label: 'SPV Name',        value: '' },
    { label: 'Project Type',    value: '' },
    { label: 'Connection (MW)', value: '' },
    { label: 'Connection Date', value: '' },
    { label: 'Trigger Date',    value: '' },
    { label: 'DM',              value: '' },
  ]},
  { title: 'Location & Description', cols: 2, rows: [
    { label: 'Site Address',             value: '' },
    { label: 'Grid Reference',           value: '' },
    { label: 'Local Planning Authority', value: '' },
    { label: 'Parish Council',           value: '' },
    { label: 'Site Access',              value: '' },
    { label: 'Description of Development', value: '' },
  ]},
  { title: 'Site Analysis', cols: 1, rows: [
    { label: 'Residential Receptors',  value: '' },
    { label: 'Topography',             value: '' },
    { label: 'Public Access Routes',   value: '' },
    { label: 'Cumulative Development', value: '' },
  ]},
  { title: 'Grid Connection', cols: 2, rows: [
    { label: 'Point of Connection (POC)', value: '' },
    { label: 'Connection Type',           value: '' },
    { label: 'Distance to POC',           value: '' },
    { label: 'Cable Route',               value: '' },
    { label: 'Batteries',                 value: '' },
    { label: 'Fencing',                   value: '' },
    { label: 'Substation / Switchgear',   value: '' },
  ]},
  { title: 'Legal Key Terms', cols: 1, rows: [
    { label: 'Option Period',   value: '' },
    { label: 'Option Fee',      value: '' },
    { label: 'Option Fee Due',  value: '' },
    { label: 'Rent',            value: '' },
    { label: 'Expansion Rent',  value: '' },
    { label: 'Tenant',          value: '' },
  ]},
  { title: 'Programme Key Dates', cols: 2, rows: [
    { label: 'Planning Submission',           value: '' },
    { label: 'Planning Consent',              value: '' },
    { label: 'Financial Investment Decision', value: '' },
    { label: 'Connection Date',               value: '' },
    { label: 'RTB',                           value: '' },
  ]},
];

function makeBibleSections() {
  return DEFAULT_BIBLE_SECTIONS.map(s => ({
    id: uid(),
    title: s.title,
    cols: s.cols || 1,
    rows: s.rows.map(r => ({ id: uid(), label: r.label, value: r.value })),
  }));
}

function migrateBible(bible) {
  // Already new format
  if (Array.isArray(bible.sections)) return bible;
  // Convert old { summary:{}, location:{}, grid:{}, programme:{}, notes:'' } → sections[]
  const toSection = (title, obj) => ({
    id: uid(), title,
    rows: Object.entries(obj || {}).map(([label, value]) => ({ id: uid(), label, value: value || '' })),
  });
  return {
    sections: [
      toSection('Project Summary', bible.summary),
      toSection('Location',        bible.location),
      toSection('Grid Connection', bible.grid),
      toSection('Programme',       bible.programme),
    ].filter(s => s.rows.length > 0),
    contacts: Array.isArray(bible.contacts) ? bible.contacts : [],
  };
}

export function enableCategoryFeature(catId, feature) {
  const newData = JSON.parse(JSON.stringify(S.data));
  const cat = newData[S.panel].categories.find(c => c.id === catId);
  if (!cat) return;
  if (feature === 'bible') {
    if (!cat.bible) {
      cat.bible = { sections: makeBibleSections(), contacts: [] };
    } else if (!Array.isArray(cat.bible.sections)) {
      cat.bible = migrateBible(cat.bible);
    }
  }
  if (feature === 'budget' && !cat.budget) {
    cat.budget = { consultants: [], invoices: [] };
  }
  upd(newData);
  set({ catTab: feature });
}

export function addBibleSection(catId) {
  const newData = JSON.parse(JSON.stringify(S.data));
  const cat = newData[S.panel].categories.find(c => c.id === catId);
  if (!cat?.bible) return;
  cat.bible.sections.push({ id: uid(), title: 'New Section', rows: [] });
  upd(newData);
}

export function updateBibleSectionTitle(catId, sectionId, title) {
  const newData = JSON.parse(JSON.stringify(S.data));
  const cat = newData[S.panel].categories.find(c => c.id === catId);
  const sec = cat?.bible?.sections?.find(s => s.id === sectionId);
  if (sec) sec.title = title;
  upd(newData);
}

export function updateBibleSection(catId, sectionId, patch) {
  const newData = JSON.parse(JSON.stringify(S.data));
  const cat = newData[S.panel].categories.find(c => c.id === catId);
  const sec = cat?.bible?.sections?.find(s => s.id === sectionId);
  if (sec) Object.assign(sec, patch);
  upd(newData);
}

export function updateBibleGateway(catId, stage) {
  const newData = JSON.parse(JSON.stringify(S.data));
  const cat = newData[S.panel].categories.find(c => c.id === catId);
  if (cat?.bible) cat.bible.gatewayStage = stage;
  upd(newData);
}

export function deleteBibleSection(catId, sectionId) {
  const newData = JSON.parse(JSON.stringify(S.data));
  const cat = newData[S.panel].categories.find(c => c.id === catId);
  if (!cat?.bible) return;
  cat.bible.sections = cat.bible.sections.filter(s => s.id !== sectionId);
  upd(newData);
}

export function addBibleRow(catId, sectionId) {
  const newData = JSON.parse(JSON.stringify(S.data));
  const cat = newData[S.panel].categories.find(c => c.id === catId);
  const sec = cat?.bible?.sections?.find(s => s.id === sectionId);
  if (sec) sec.rows.push({ id: uid(), label: '', value: '' });
  upd(newData);
}

export function updateBibleRow(catId, sectionId, rowId, patch) {
  const newData = JSON.parse(JSON.stringify(S.data));
  const cat = newData[S.panel].categories.find(c => c.id === catId);
  const sec = cat?.bible?.sections?.find(s => s.id === sectionId);
  const row = sec?.rows?.find(r => r.id === rowId);
  if (row) {
    Object.assign(row, patch);
    // Cascade linked fields to all invoices in this category
    if ('value' in patch && row.label) {
      const lbl = row.label.toLowerCase().trim();
      const invoiceField =
        (lbl === 'project name' || lbl === 'project') ? 'project' :
        (lbl === 'spv name'    || lbl === 'spv')      ? 'spvName' :
        (lbl === 'dm'          || lbl === 'development manager' || lbl === 'project manager') ? 'dm' :
        null;
      if (invoiceField && cat?.budget?.invoices) {
        cat.budget.invoices.forEach(inv => { inv[invoiceField] = patch.value ?? ''; });
      }
    }
  }
  upd(newData);
}

export function deleteBibleRow(catId, sectionId, rowId) {
  const newData = JSON.parse(JSON.stringify(S.data));
  const cat = newData[S.panel].categories.find(c => c.id === catId);
  const sec = cat?.bible?.sections?.find(s => s.id === sectionId);
  if (sec) sec.rows = sec.rows.filter(r => r.id !== rowId);
  upd(newData);
}

export function addBibleContact(catId, contact) {
  const newData = JSON.parse(JSON.stringify(S.data));
  const cat = newData[S.panel].categories.find(c => c.id === catId);
  if (!cat?.bible) return;
  cat.bible.contacts = [...(cat.bible.contacts || []), { id: uid(), ...contact }];
  upd(newData);
}

export function updateBibleContact(catId, contactId, patch) {
  const newData = JSON.parse(JSON.stringify(S.data));
  const cat = newData[S.panel].categories.find(c => c.id === catId);
  if (!cat?.bible) return;
  const idx = cat.bible.contacts.findIndex(c => c.id === contactId);
  if (idx >= 0) Object.assign(cat.bible.contacts[idx], patch);
  upd(newData);
}

export function deleteBibleContact(catId, contactId) {
  const newData = JSON.parse(JSON.stringify(S.data));
  const cat = newData[S.panel].categories.find(c => c.id === catId);
  if (!cat?.bible) return;
  cat.bible.contacts = cat.bible.contacts.filter(c => c.id !== contactId);
  upd(newData);
}

export function addBudgetConsultant(catId, data) {
  const newData = JSON.parse(JSON.stringify(S.data));
  const cat = newData[S.panel].categories.find(c => c.id === catId);
  if (!cat?.budget) return;
  cat.budget.consultants = [...cat.budget.consultants, { id: uid(), ...data }];
  upd(newData);
}

export function updateBudgetConsultant(catId, consultantId, patch) {
  const newData = JSON.parse(JSON.stringify(S.data));
  const cat = newData[S.panel].categories.find(c => c.id === catId);
  if (!cat?.budget) return;
  const idx = cat.budget.consultants.findIndex(c => c.id === consultantId);
  if (idx >= 0) Object.assign(cat.budget.consultants[idx], patch);
  upd(newData);
}

export function deleteBudgetConsultant(catId, consultantId) {
  const newData = JSON.parse(JSON.stringify(S.data));
  const cat = newData[S.panel].categories.find(c => c.id === catId);
  if (!cat?.budget) return;
  cat.budget.consultants = cat.budget.consultants.filter(c => c.id !== consultantId);
  upd(newData);
}

export function addBudgetInvoice(catId, data) {
  const newData = JSON.parse(JSON.stringify(S.data));
  const cat = newData[S.panel].categories.find(c => c.id === catId);
  if (!cat?.budget) return;
  cat.budget.invoices = [...cat.budget.invoices, { id: uid(), ...data }];
  upd(newData);
}

export function updateBudgetInvoice(catId, invoiceId, patch) {
  const newData = JSON.parse(JSON.stringify(S.data));
  const cat = newData[S.panel].categories.find(c => c.id === catId);
  if (!cat?.budget) return;
  const idx = cat.budget.invoices.findIndex(i => i.id === invoiceId);
  if (idx >= 0) Object.assign(cat.budget.invoices[idx], patch);
  upd(newData);
}

export function deleteBudgetInvoice(catId, invoiceId) {
  const newData = JSON.parse(JSON.stringify(S.data));
  const cat = newData[S.panel].categories.find(c => c.id === catId);
  if (!cat?.budget) return;
  cat.budget.invoices = cat.budget.invoices.filter(i => i.id !== invoiceId);
  upd(newData);
}
