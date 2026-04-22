import { S, setRenderFn, getPanelData, getFilteredItems, getActiveCatName, set, toggleSidebar, gotoDashboard, loadCalFreeMinutes, initFromSupabase } from './store.js';
import { isSupabaseConfigured, onAuthStateChange } from './services/supabase.js';
import { setGoogleFromSupabase } from './services/calendar.js';
import { buildAuthGate } from './components/authGate.js';
import { isAuthenticated, buildPasswordGate } from './components/passwordGate.js';
import { customSelect } from './dom.js';
import { isOverdue, daysBefore, TODAY } from './utils.js';
import { h } from './dom.js';
import { buildAddForm } from './components/addForm.js';
import { buildSettings } from './components/settings.js';
import { buildSidebar } from './components/sidebar.js';
import { renderSections } from './components/card.js';
import { buildCalendarView } from './components/calendarView.js';

// ── Search focus restoration ──────────────────────────────────────────────────
// Saved across renders so typing into the search bar doesn't lose the caret.
let _searchWasFocused = false;
let _searchCaretPos   = 0;
let _searchRenderTimer = null;

// ── Topbar ────────────────────────────────────────────────────────────────────

function buildTopbar() {
  const searchInput = h('input', {
    class: 'search-input',
    type: 'text',
    placeholder: 'Search tasks, notes…',
    value: S.searchQuery || '',
    onFocus:   () => { _searchWasFocused = true; },
    onBlur:    () => { _searchWasFocused = false; },
    onInput:   e  => {
      _searchCaretPos = e.target.selectionStart;
      S.searchQuery = e.target.value;         // update state immediately (no render)
      clearTimeout(_searchRenderTimer);
      _searchRenderTimer = setTimeout(() => render(), 150); // debounced render
    },
    onKeydown: e  => { if (e.key === 'Escape') { _searchWasFocused = false; clearTimeout(_searchRenderTimer); set({ searchQuery: '' }); } },
  });

  const clearBtn = S.searchQuery
    ? h('button', { class: 'search-clear', title: 'Clear search', onClick: () => { _searchWasFocused = false; set({ searchQuery: '' }); } }, '×')
    : null;

  return h('div', { class: 'topbar' },
    h('div', { class: 'topbar-left' },
      h('button', { class: 'sidebar-toggle', onClick: toggleSidebar, title: S.sidebarCollapsed ? 'Show sidebar' : 'Hide sidebar' }, '≡'),
      h('img', {
        class: 'topbar-logo-img',
        src: S.theme === 'dark' ? 'dist/logo-dark.svg' : 'dist/logo-light.svg',
        alt: 'Focusboard',
        draggable: 'false',
        onClick: gotoDashboard,
        style: { cursor: 'pointer' },
      }),
    ),
    h('div', { class: 'topbar-search' },
      h('span', { class: 'search-icon' }, '⌕'),
      searchInput,
      clearBtn,
    ),
    h('div', { class: 'topbar-right' },
      S.syncError
        ? h('span', { class: 'sync-error-badge', title: S.syncError }, '⚠ Sync failed')
        : null,
      S.calError
        ? h('span', { class: 'sync-error-badge', title: S.calError }, '⚠ Calendar')
        : null,
      h('button', { class: 'btn', onClick: () => set({ showSettings: true }) }, '⚙ Settings'),
      h('button', {
        class: `btn btn-primary${S.showAddItem ? ' active' : ''}`,
        onClick: () => set({ showAddItem: !S.showAddItem, showAddCat: false }),
      }, S.showAddItem ? '✕ Cancel' : '+ Add item'),
    ),
  );
}

// ── Search ────────────────────────────────────────────────────────────────────

function searchAllItems(query) {
  const q = query.toLowerCase().trim();
  if (!q) return { work: [], life: [] };

  // Build a flat category-name lookup across both panels
  const cats = {};
  ['work', 'life'].forEach(panel => {
    (S.data[panel]?.categories || []).forEach(c => { cats[c.id] = c.name; });
  });

  const matches = str => str && str.toLowerCase().includes(q);

  const filterPanel = panel =>
    (S.data[panel]?.items || []).filter(item => {
      return (
        matches(item.title) ||
        matches(item.notes) ||
        matches(item.waitingFrom) ||
        matches(cats[item.categoryId]) ||
        (item.tasks || []).some(t =>
          matches(t.title) || matches(t.notes) || matches(t.subNature) || matches(t.waitingFrom),
        ) ||
        (item.checklist || []).some(c => matches(c.title))
      );
    });

  return { work: filterPanel('work'), life: filterPanel('life') };
}

function buildSearchView() {
  const query   = S.searchQuery.trim();
  const results = searchAllItems(query);
  const total   = results.work.length + results.life.length;

  const frag = document.createDocumentFragment();

  frag.appendChild(h('div', { class: 'panel-title' }, 'Search results'));
  frag.appendChild(h('div', { class: 'panel-breadcrumb' },
    total ? `${total} result${total !== 1 ? 's' : ''} for "${query}"` : `No results for "${query}"`,
  ));

  if (!total) {
    frag.appendChild(h('div', { class: 'empty-state' }, 'Try a different search term'));
    return frag;
  }

  if (results.work.length) {
    frag.appendChild(h('div', { class: 'search-panel-label' }, `Work · ${results.work.length}`));
    frag.appendChild(renderSections(results.work, null));
  }
  if (results.life.length) {
    frag.appendChild(h('div', { class: 'search-panel-label' }, `Life · ${results.life.length}`));
    frag.appendChild(renderSections(results.life, null));
  }

  return frag;
}

// ── Task panel header ─────────────────────────────────────────────────────────

function buildPanelHeader() {
  const capitalize = s => s[0].toUpperCase() + s.slice(1);
  const title = S.view === 'dashboard' ? `${capitalize(S.panel)} dashboard` : getActiveCatName();
  const children = [h('div', { class: 'panel-title' }, title)];

  if (S.view === 'workload') return []; // workload builds its own header

  if (S.view === 'dashboard') {
    children.push(h('div', { class: 'panel-breadcrumb' }, `All ${S.panel} tasks`));
    // Dashboard view tabs: All | Today | This week
    const tabs = [
      { v: 'all',   l: 'All' },
      { v: 'today', l: 'Today' },
      { v: 'week',  l: 'This week' },
    ];
    children.push(h('div', { class: 'dash-tab-row' },
      ...tabs.map(t =>
        h('button', {
          class: `dash-tab${S.dashTab === t.v ? ' active' : ''}`,
          onClick: () => set({ dashTab: t.v, dashFilter: null }),
        }, t.l),
      ),
    ));
  } else {
    const bc = h('div', { class: 'panel-breadcrumb' });
    bc.innerHTML = `${capitalize(S.panel)} <span>/ ${getActiveCatName()}</span>`;
    children.push(bc);
  }

  if (S.view === 'category') {
    const filters = ['all', 'tasks', 'workflows', 'awaiting', 'unscheduled'];
    children.push(h('div', { class: 'filter-row' },
      ...filters.map(f =>
        h('button', {
          class: `filter-chip${S.filter === f ? ' active' : ''}`,
          onClick: () => set({ filter: f }),
        }, f[0].toUpperCase() + f.slice(1)),
      ),
    ));
  }

  return children;
}

// ── Dashboard summary cards ───────────────────────────────────────────────────

function getDashboardGroups(items) {
  const tasks     = items.filter(i => i.type !== 'workflow');
  const workflows = items.filter(i => i.type === 'workflow' && !i.done);

  // ── Workflow waiting tasks ─────────────────────────────────────────────────
  const isWfTaskChaseDue = t => {
    if (!t || t.nature !== 'waiting' || t.status !== 'active') return false;
    if (t.chaseDate) return daysBefore(t.chaseDate) >= 0;
    const daysOut = t.waitingSince ? daysBefore(t.waitingSince) : 0;
    return daysOut >= (t.followUpDays || 5);
  };
  const hasActiveWaiting = wf => (wf.tasks || []).some(t => t.status === 'active' && t.nature === 'waiting');
  const hasAnyChaseDue   = wf => (wf.tasks || []).some(isWfTaskChaseDue);
  const awaitingWfs      = workflows.filter(hasActiveWaiting);

  // ── Standalone waiting tasks ───────────────────────────────────────────────
  const isTaskChaseDue = t => t.nature === 'waiting' && !t.done && !!t.chaseDate && daysBefore(t.chaseDate) >= 0;
  const waitingTasks   = tasks.filter(t => t.nature === 'waiting' && !t.done);

  // Action tasks only for overdue / today / upcoming (waiting tasks use their own tiles)
  const actionTasks = tasks.filter(t => t.nature !== 'waiting');

  return {
    overdue:       actionTasks.filter(i => isOverdue(i.dueDate) && !i.done),
    dueToday:      actionTasks.filter(i => i.dueDate === TODAY && !isOverdue(i.dueDate) && !i.done),
    upcoming:      actionTasks.filter(i => i.dueDate && !isOverdue(i.dueDate) && i.dueDate !== TODAY && !i.done),
    chaseDue:      [...awaitingWfs.filter(hasAnyChaseDue),         ...waitingTasks.filter(isTaskChaseDue)],
    awaitingReply: [...awaitingWfs.filter(wf => !hasAnyChaseDue(wf)), ...waitingTasks.filter(t => !isTaskChaseDue(t))],
    completed:     items.filter(i => i.done),
  };
}

function buildDashboardSummary(groups) {
  const active = S.dashFilter;

  const stat = (key, count, label, sublabel, accent, urgent = false) => {
    const isActive = active === key;
    const card = h('div', {
      class: `summary-card${urgent && count > 0 ? ' summary-urgent' : ''}${isActive ? ' summary-active' : ''}`,
      style: { borderTopColor: accent, cursor: 'pointer' },
      onClick: () => set({ dashFilter: isActive ? null : key }),
    },
      h('div', { class: 'summary-count', style: { color: count > 0 ? accent : 'var(--text4)' } }, String(count)),
      h('div', { class: 'summary-label' }, label),
      sublabel ? h('div', { class: 'summary-sub' }, sublabel) : null,
    );
    return card;
  };

  return h('div', { class: 'summary-row' },
    stat('overdue',       groups.overdue.length,       'Overdue',        'tasks',  '#A32D2D', true),
    stat('dueToday',      groups.dueToday.length,      'Due today',      'tasks',  '#854F0B'),
    stat('upcoming',      groups.upcoming.length,       'Upcoming',       'tasks',  '#185FA5'),
    h('div', { class: 'summary-divider' }),
    stat('chaseDue',      groups.chaseDue.length,      'Chase due',      'items',  '#A32D2D', true),
    stat('awaitingReply', groups.awaitingReply.length,  'Awaiting reply', 'items',  '#378ADD'),
    stat('completed',     groups.completed.length,      'Completed',      'all',    '#1D9E75'),
  );
}

// ── Dashboard content ─────────────────────────────────────────────────────────

const FILTER_LABELS = {
  overdue:      'Overdue tasks',
  dueToday:     'Due today',
  upcoming:     'Upcoming tasks',
  chaseDue:     'Chase due',
  awaitingReply:'Awaiting reply',
  completed:    'Completed',
};

// ── Completed deck ────────────────────────────────────────────────────────────

function buildCompletedDeck(doneItems) {
  if (!doneItems.length) return null;
  const isOpen = S.completedOpen;
  const toggle = h('button', {
    class: 'completed-deck-toggle',
    onClick: () => set({ completedOpen: !S.completedOpen }),
  },
    h('span', { class: 'completed-deck-chevron' }, isOpen ? '▲' : '▼'),
    `Completed · ${doneItems.length}`,
  );
  const deck = h('div', { class: `completed-deck${isOpen ? ' open' : ''}` });
  if (isOpen) {
    doneItems.forEach(item => {
      deck.appendChild(renderSections([item], item.categoryId));
    });
  }
  return h('div', { class: 'completed-section' }, toggle, deck);
}

// ── Summary view ─────────────────────────────────────────────────────────────

const SUMMARY_PERIODS = [
  { v: 'today',   l: 'Today' },
  { v: 'week',    l: 'This week' },
  { v: 'month',   l: 'This month' },
  { v: 'quarter', l: 'Last 3 months' },
  { v: 'half',    l: 'Last 6 months' },
  { v: 'year',    l: 'Last year' },
  { v: '2year',   l: 'Last 2 years' },
  { v: 'all',     l: 'All time' },
];

function getPeriodStart(period) {
  if (period === 'all') return '0000-00-00';
  const d = new Date();
  if (period === 'today')   return TODAY;
  if (period === 'week')    { d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); }
  if (period === 'month')   { d.setDate(1); }
  if (period === 'quarter') { d.setMonth(d.getMonth() - 3); }
  if (period === 'half')    { d.setMonth(d.getMonth() - 6); }
  if (period === 'year')    { d.setFullYear(d.getFullYear() - 1); }
  if (period === '2year')   { d.setFullYear(d.getFullYear() - 2); }
  return d.toISOString().split('T')[0];
}

function buildWorkloadView() {
  const allItems = [
    ...(S.data.work?.items || []).map(i => ({ ...i, _panel: 'work' })),
    ...(S.data.life?.items || []).map(i => ({ ...i, _panel: 'life' })),
  ];

  const period     = S.workloadPeriod || 'week';
  const start      = getPeriodStart(period);
  const doneAll    = allItems.filter(i => i.done);
  const donePeriod = period === 'today'
    ? doneAll.filter(i => i.doneDate === TODAY)
    : doneAll.filter(i => (i.doneDate || '9999') >= start);

  const frag = document.createDocumentFragment();

  // Header row with title + period dropdown
  const headerRow = h('div', { class: 'summary-header-row' },
    h('div', {},
      h('div', { class: 'panel-title' }, 'Summary'),
      h('div', { class: 'panel-breadcrumb' }, 'Completed work overview'),
    ),
    h('div', { class: 'summary-period-wrap' },
      customSelect(SUMMARY_PERIODS, period, v => set({ workloadPeriod: v })),
    ),
  );
  frag.appendChild(headerRow);

  // Stats — tasks done + workflows closed
  const tasksDone = donePeriod.filter(i => i.type !== 'workflow').length;
  const wfDone    = donePeriod.filter(i => i.type === 'workflow').length;

  frag.appendChild(h('div', { class: 'workload-stats' },
    h('div', { class: 'workload-stat' },
      h('div', { class: 'workload-stat-value' }, String(tasksDone)),
      h('div', { class: 'workload-stat-label' }, 'Tasks completed'),
    ),
    h('div', { class: 'workload-stat' },
      h('div', { class: 'workload-stat-value' }, String(wfDone)),
      h('div', { class: 'workload-stat-label' }, 'Workflows closed'),
    ),
  ));

  // Completed items list
  if (!donePeriod.length) {
    frag.appendChild(h('div', { class: 'empty-state' }, 'Nothing completed in this period yet'));
  } else {
    const workDone = donePeriod.filter(i => i._panel === 'work');
    const lifeDone = donePeriod.filter(i => i._panel === 'life');
    if (workDone.length) {
      frag.appendChild(h('div', { class: 'search-panel-label' }, `Work · ${workDone.length}`));
      frag.appendChild(renderSections(workDone, null));
    }
    if (lifeDone.length) {
      frag.appendChild(h('div', { class: 'search-panel-label' }, `Life · ${lifeDone.length}`));
      frag.appendChild(renderSections(lifeDone, null));
    }
  }

  return frag;
}

// ── Shared helpers for Today / This week tab content ─────────────────────────

function getWeekStart() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); // Monday
  return d.toISOString().split('T')[0];
}

function getWeekEnd() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + (6 - ((d.getDay() + 6) % 7))); // Sunday
  return d.toISOString().split('T')[0];
}

function buildTodayContent(frag) {
  const todayAbbr = new Date().toLocaleDateString('en-GB', { weekday: 'short' });
  const allItems  = [...(S.data.work?.items || []), ...(S.data.life?.items || [])];
  const isTodaySession = s => s.date === TODAY || (!s.date && s.day === todayAbbr);

  // Focus schedule time-blocks (both panels)
  const todaySessions = [];
  allItems.forEach(item => {
    if (item.done) return;
    const sessions = item.focusSessions?.length ? item.focusSessions : item.focusBlock ? [item.focusBlock] : [];
    sessions.forEach(s => { if (isTodaySession(s)) todaySessions.push({ ...s, itemTitle: item.title }); });
  });
  todaySessions.sort((a, b) => (a.start || '').localeCompare(b.start || ''));

  if (todaySessions.length) {
    frag.appendChild(h('div', { class: 'group-label' }, `Focus schedule · ${todaySessions.length} block${todaySessions.length !== 1 ? 's' : ''}`));
    const scheduleEl = h('div', { class: 'today-schedule' });
    todaySessions.forEach(s => scheduleEl.appendChild(h('div', { class: 'today-block' },
      h('div', { class: 'today-block-time' }, `${s.start} – ${s.end}`),
      h('div', { class: 'today-block-title' }, s.itemTitle),
    )));
    frag.appendChild(scheduleEl);
  }

  const panelItems = getPanelData().items;
  const focusedIds = new Set(
    allItems.filter(i => !i.done && (i.focusSessions?.some(isTodaySession) || (i.focusBlock && isTodaySession(i.focusBlock)))).map(i => i.id),
  );

  const actionItems   = panelItems.filter(i => i.type !== 'workflow' && i.nature !== 'waiting');
  const workflowItems = panelItems.filter(i => {
    if (i.type !== 'workflow' || i.done) return false;
    if (i.hasDueDate && i.dueDate && (i.dueDate === TODAY || isOverdue(i.dueDate))) return true;
    return (i.tasks || []).some(t => t.status === 'active' && (t.dueDate === TODAY || isOverdue(t.dueDate)));
  });
  const overdue  = [
    ...actionItems.filter(i => !i.done && isOverdue(i.dueDate)),
    ...workflowItems.filter(i => isOverdue(i.dueDate) || (i.tasks || []).some(t => t.status === 'active' && isOverdue(t.dueDate))),
  ];
  const dueToday = [
    ...actionItems.filter(i => !i.done && i.dueDate === TODAY && !isOverdue(i.dueDate)),
    ...workflowItems.filter(i => !isOverdue(i.dueDate) && (i.dueDate === TODAY || (i.tasks || []).some(t => t.status === 'active' && t.dueDate === TODAY))),
  ];
  const shownIds  = new Set([...overdue, ...dueToday].map(i => i.id));
  const focusOnly = panelItems.filter(i => focusedIds.has(i.id) && !shownIds.has(i.id));

  const hasWork = overdue.length || dueToday.length || focusOnly.length;
  if (!hasWork && !todaySessions.length) {
    frag.appendChild(h('div', { class: 'today-clear' },
      h('div', { class: 'today-clear-icon' }, '✓'),
      h('div', { class: 'today-clear-text' }, "You're all clear for today"),
    ));
  } else {
    if (overdue.length) {
      frag.appendChild(h('div', { class: 'group-label today-overdue-label' }, `Overdue · ${overdue.length}`));
      frag.appendChild(renderSections(overdue, null, { hideDone: true }));
    }
    if (dueToday.length) {
      frag.appendChild(h('div', { class: 'group-label' }, `Due today · ${dueToday.length}`));
      frag.appendChild(renderSections(dueToday, null, { hideDone: true }));
    }
    if (focusOnly.length) {
      frag.appendChild(h('div', { class: 'group-label' }, `Scheduled focus · ${focusOnly.length}`));
      frag.appendChild(renderSections(focusOnly, null, { hideDone: true }));
    }
  }
}

function buildWeekContent(frag) {
  const weekStart = getWeekStart();
  const weekEnd   = getWeekEnd();
  const allItems  = [...(S.data.work?.items || []), ...(S.data.life?.items || [])];

  const isWeekSession = s => s.date && s.date >= weekStart && s.date <= weekEnd;
  const focusedWeekIds = new Set(
    allItems.filter(i => !i.done && (i.focusSessions?.some(isWeekSession) || (i.focusBlock && isWeekSession(i.focusBlock)))).map(i => i.id),
  );

  const panelItems    = getPanelData().items;
  const actionItems   = panelItems.filter(i => i.type !== 'workflow' && i.nature !== 'waiting');
  const workflowItems = panelItems.filter(i => i.type === 'workflow' && !i.done &&
    ((i.hasDueDate && i.dueDate >= weekStart && i.dueDate <= weekEnd) ||
     (i.tasks || []).some(t => t.status === 'active' && t.dueDate >= weekStart && t.dueDate <= weekEnd)));

  const overdue   = [
    ...actionItems.filter(i => !i.done && isOverdue(i.dueDate)),
    ...panelItems.filter(i => i.type === 'workflow' && !i.done &&
      (isOverdue(i.dueDate) || (i.tasks || []).some(t => t.status === 'active' && isOverdue(t.dueDate)))),
  ];
  const dueToday  = [
    ...actionItems.filter(i => !i.done && i.dueDate === TODAY),
    ...workflowItems.filter(i => i.dueDate === TODAY || (i.tasks || []).some(t => t.status === 'active' && t.dueDate === TODAY)),
  ];
  const dueWeek   = [
    ...actionItems.filter(i => !i.done && i.dueDate > TODAY && i.dueDate <= weekEnd),
    ...workflowItems.filter(i => !dueToday.find(d => d.id === i.id) && !overdue.find(o => o.id === i.id)),
  ];
  const shownIds  = new Set([...overdue, ...dueToday, ...dueWeek].map(i => i.id));
  const focusOnly = panelItems.filter(i => focusedWeekIds.has(i.id) && !shownIds.has(i.id));

  const hasWork = overdue.length || dueToday.length || dueWeek.length || focusOnly.length;
  if (!hasWork) {
    frag.appendChild(h('div', { class: 'today-clear' },
      h('div', { class: 'today-clear-icon' }, '✓'),
      h('div', { class: 'today-clear-text' }, 'Nothing due or scheduled this week'),
    ));
    return;
  }
  if (overdue.length) {
    frag.appendChild(h('div', { class: 'group-label today-overdue-label' }, `Overdue · ${overdue.length}`));
    frag.appendChild(renderSections(overdue, null, { hideDone: true }));
  }
  if (dueToday.length) {
    frag.appendChild(h('div', { class: 'group-label' }, `Due today · ${dueToday.length}`));
    frag.appendChild(renderSections(dueToday, null, { hideDone: true }));
  }
  if (dueWeek.length) {
    frag.appendChild(h('div', { class: 'group-label' }, `Due this week · ${dueWeek.length}`));
    frag.appendChild(renderSections(dueWeek, null, { hideDone: true }));
  }
  if (focusOnly.length) {
    frag.appendChild(h('div', { class: 'group-label' }, `Scheduled focus · ${focusOnly.length}`));
    frag.appendChild(renderSections(focusOnly, null, { hideDone: true }));
  }
}

function buildDashboard() {
  const items  = getPanelData().items;
  const groups = getDashboardGroups(items);

  if (!items.length) {
    return [h('div', { class: 'empty-state' }, 'No tasks yet — click + Add item to get started')];
  }

  const frag = document.createDocumentFragment();
  const tab = S.dashTab || 'all';

  if (tab === 'today') {
    buildTodayContent(frag);
    return [frag];
  }

  if (tab === 'week') {
    buildWeekContent(frag);
    return [frag];
  }

  // ── All tab ───────────────────────────────────────────────────────────────
  frag.appendChild(buildDashboardSummary(groups));

  const f = S.dashFilter;
  if (f === 'completed') {
    frag.appendChild(h('div', { class: 'dash-filter-bar' },
      h('span', { class: 'dash-filter-label' }, FILTER_LABELS[f]),
      h('button', { class: 'dash-filter-clear', onClick: () => set({ dashFilter: null }) }, '✕ Show all'),
    ));
    frag.appendChild(groups.completed.length
      ? renderSections(groups.completed, null)
      : h('div', { class: 'empty-state' }, 'Nothing here'));
  } else if (f) {
    const filtered = groups[f] || [];
    frag.appendChild(h('div', { class: 'dash-filter-bar' },
      h('span', { class: 'dash-filter-label' }, FILTER_LABELS[f]),
      h('button', { class: 'dash-filter-clear', onClick: () => set({ dashFilter: null }) }, '✕ Show all'),
    ));
    frag.appendChild(filtered.length
      ? renderSections(filtered, null, { hideDone: true })
      : h('div', { class: 'empty-state' }, 'Nothing here'));
  } else {
    frag.appendChild(renderSections(items, null, { hideDone: true }));
    const deck = buildCompletedDeck(groups.completed);
    if (deck) frag.appendChild(deck);
  }

  return [frag];
}

// ── Category view content ─────────────────────────────────────────────────────

function buildCategoryView() {
  const items = getFilteredItems();
  if (!items.length) return [h('div', { class: 'empty-state' }, 'No items here')];
  const done  = items.filter(i => i.done);
  const frag  = document.createDocumentFragment();
  frag.appendChild(renderSections(items, S.activeCat, { hideDone: true }));
  const deck = buildCompletedDeck(done);
  if (deck) frag.appendChild(deck);
  return [frag];
}

// ── Focus blocks view ─────────────────────────────────────────────────────────

function buildFocusBlocksView() {
  const allItems = [
    ...(S.data.work?.items || []),
    ...(S.data.life?.items || []),
  ].filter(i => i.focusBlock && !i.done);

  const title = h('div', { class: 'panel-title' }, 'Focus blocks');
  const sub   = h('div', { class: 'panel-breadcrumb' }, 'All scheduled focus time');

  if (!allItems.length) {
    return h('div', {}, title, sub,
      h('div', { class: 'empty-state' }, 'No focus blocks scheduled yet — open a task and click "Suggest focus block"'),
    );
  }

  const rows = allItems.map(item =>
    h('div', { class: 'focus-block-row' },
      h('div', { class: 'fb-time' }, `${item.focusBlock.day} ${item.focusBlock.start} – ${item.focusBlock.end}`),
      h('div', { class: 'fb-title' }, item.title),
      h('div', { class: 'fb-panel' }, item.categoryId ? '' : ''),
    ),
  );

  return h('div', {}, title, sub, h('div', { class: 'focus-block-list' }, ...rows));
}

// ── Main render ───────────────────────────────────────────────────────────────

export function render() {
  // ── Auth gate ────────────────────────────────────────────────────────────────
  // Supabase takes priority when configured. Falls back to password hash gate
  // for local / non-Supabase builds.
  if (isSupabaseConfigured()) {
    if (!S.userId) {
      // Not signed in — show Google sign-in screen
      document.body.className = S.theme;
      const target = document.getElementById('app') || document.body;
      target.innerHTML = '';
      target.appendChild(buildAuthGate());
      return;
    }
    if (S.loading) {
      // Signed in but board data still loading
      document.body.className = S.theme;
      const target = document.getElementById('app') || document.body;
      target.innerHTML = '';
      target.appendChild(h('div', { class: 'sb-loading' },
        h('div', { class: 'sb-loading-logo' },
          h('span', { class: 'ag-logo-focus' }, 'focus'),
          h('span', { class: 'ag-logo-board' }, 'board'),
        ),
        h('div', { class: 'sb-spinner' }),
      ));
      return;
    }
  } else if (!isAuthenticated()) {
    // Fallback: password hash gate (local builds)
    document.body.className = S.theme;
    const target = document.getElementById('app') || document.body;
    target.innerHTML = '';
    target.appendChild(buildPasswordGate(() => render()));
    return;
  }

  document.body.className = S.theme;
  const app = document.getElementById('app');
  app.innerHTML = '';

  app.appendChild(buildTopbar());

  const main = h('div', { class: 'main' });
  main.appendChild(buildSidebar());

  const taskPanel = h('div', { class: S.view === 'calendar' ? 'task-panel cal-panel' : 'task-panel' });

  if (S.searchQuery.trim()) {
    const sf = buildSearchView();
    taskPanel.appendChild(sf);
  } else if (S.view === 'workload') {
    taskPanel.appendChild(buildWorkloadView());
  } else if (S.view === 'calendar') {
    taskPanel.appendChild(buildCalendarView());
  } else if (S.view === 'focus') {
    taskPanel.appendChild(buildFocusBlocksView());
  } else {
    if (S.showAddItem) taskPanel.appendChild(buildAddForm());
    buildPanelHeader().forEach(el => taskPanel.appendChild(el));
    const content = S.view === 'dashboard' ? buildDashboard() : buildCategoryView();
    content.forEach(el => taskPanel.appendChild(el));
  }

  main.appendChild(taskPanel);
  app.appendChild(main);

  if (S.showSettings) app.appendChild(buildSettings());

  // Restore search input focus + caret after full re-render
  if (_searchWasFocused) {
    const inp = document.querySelector('.search-input');
    if (inp) { inp.focus(); inp.setSelectionRange(_searchCaretPos, _searchCaretPos); }
  }
}

// ── Bootstrap ─────────────────────────────────────────────────────────────────

document.body.className = S.theme;
setRenderFn(render);

// ── Supabase auth listener ────────────────────────────────────────────────────
// Fires immediately with INITIAL_SESSION, then on every sign-in/sign-out.
if (isSupabaseConfigured()) {
  onAuthStateChange(async (event, session) => {
    if (session?.user && !S.userId) {
      // Just signed in (or page loaded with an active session)
      await initFromSupabase(session.user.id);
      // Auto-connect Google Calendar using the provider token from the OAuth session
      if (session.provider_token) {
        const expiresAt = session.expires_at ? session.expires_at * 1000 : Date.now() + 55 * 60_000;
        setGoogleFromSupabase(session.provider_token, expiresAt);
      }
      loadCalFreeMinutes();
    } else if (!session?.user && S.userId) {
      // Signed out
      S.userId  = null;
      S.loading = false;
      render();
    } else if (!session?.user) {
      // No session on initial load — show auth gate
      render();
    }
  });
} else {
  // No Supabase — render immediately (password gate or open access)
  render();
  loadCalFreeMinutes();
}
