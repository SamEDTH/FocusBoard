import { STORAGE_KEY, SETTINGS_KEY, DEFAULT, TODAY } from './constants.js';
import { uid } from './utils.js';
import { getTotalFreeMinutes, isAnyConnected } from './services/calendar.js';

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
  focusBuffer:   savedSettings.focusBuffer   ?? 15,
  focusMinBlock: savedSettings.focusMinBlock ?? 30,
  followUpDays:  savedSettings.followUpDays  ?? 5,
  calFreeMinutes: null, // total free working-hour minutes today (null = not loaded / no calendar)
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
    renderFn();
  } catch {
    S.calFreeMinutes = null;
  }
}

// ── Core state updaters ───────────────────────────────────────────────────────

export function set(patch) { Object.assign(S, patch); renderFn(); }
export function upd(newData) { S.data = newData; saveData(newData); renderFn(); }

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
  set({ view: 'category', activeCat: id, filter: 'all', showAddItem: false, showAddCat: false, dashFilter: null });
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
      const next = JSON.parse(JSON.stringify(items[idx]));
      next.id       = uid();
      next.done     = false;
      next.doneAt   = undefined;
      next.doneDate = undefined;
      next.dueDate  = nextRecurringDueDate(items[idx].dueDate, items[idx].recurrence);
      next.focusSessions = [];
      items.push(next);
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

export function addCategory(name) {
  const newData = JSON.parse(JSON.stringify(S.data));
  newData[S.panel].categories.push({
    id: name.toLowerCase().replace(/\s+/g, '-') + '-' + Date.now(),
    name,
  });
  set({ showAddCat: false });
  upd(newData);
}
