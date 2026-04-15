// Card rendering: shared helpers, meta rows, the card shell, and section grouping.
// Heavy workflow and task body logic lives in workflowTask.js / taskBody.js.

import { S, getPanelData, toggleCard, toggleMore, startEdit, toggleDone, updateItem, deleteItem, convertItem } from '../store.js';
import { isOverdue, computePriority, isPriorityAuto, computeWorkflowPriority, getPriorityColor, formatDue, TODAY, setCompetitionMap, computeCompetitionMap, getEffectivePriority, isCompetitionPriority, getCalPressure } from '../utils.js';
import { getItemSessions, getBookedMins } from './focusPicker.js';
import { h, createSvg } from '../dom.js';
import { onDragStart, onDragEnd, onDragOver, onDrop, lastDroppedId } from '../dragdrop.js';
import { buildEditForm, buildTaskBody } from './taskBody.js';
import { buildWorkflowBody } from './workflowTask.js';

// ── Priority badge ────────────────────────────────────────────────────────────

// Hex-opacity trick: background at 13% opacity, border at 33% — no extra CSS vars needed
// isCompetition overrides isAuto: ↑ means "lifted by competition", ⚡ means "auto from deadline"
function priorityBadge(p, isAuto, isCompetition) {
  const color  = getPriorityColor(p);
  const suffix = isCompetition ? ' ↑' : isAuto ? ' ⚡' : '';
  return h('span', {
    class: 'priority-badge',
    style: { background: `${color}22`, color, border: `1px solid ${color}55` },
  }, `P${p}${suffix}`);
}

// ── Icons ─────────────────────────────────────────────────────────────────────

function workflowIcon() {
  return h('div', { class: 'wf-icon' },
    createSvg('10', '10', '0 0 10 10',
      '<circle cx="2" cy="2" r="1.5" fill="#185FA5"/>' +
      '<circle cx="8" cy="2" r="1.5" fill="#185FA5"/>' +
      '<circle cx="5" cy="8" r="1.5" fill="#185FA5"/>' +
      '<line x1="2" y1="2" x2="8" y2="2" stroke="#185FA5" stroke-width="1"/>' +
      '<line x1="8" y1="2" x2="5" y2="8" stroke="#185FA5" stroke-width="1"/>',
    ),
  );
}

function checkIcon() {
  return createSvg('8', '8', '0 0 8 8',
    '<path d="M1.5 4L3 5.5L6.5 2" stroke="white" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>',
  );
}

// ── Meta row (summary line below the card title) ─────────────────────────────

function buildTaskMeta(item, overdue) {
  const children  = [];
  const eff       = getEffectivePriority(item);
  const isComp    = isCompetitionPriority(item.id);
  const auto      = !isComp && isPriorityAuto(item);
  children.push(priorityBadge(eff, auto && !item.done, isComp && !item.done));

  if (item.nature === 'waiting' && !item.done) {
    const label = item.waitingFrom ? `⏳ Waiting · ${item.waitingFrom}` : '⏳ Waiting';
    children.push(h('span', { class: 'badge badge-awaiting' }, label));
  }

  if (item.dueDate) {
    const color = overdue ? '#A32D2D' : item.done ? '#1D9E75' : 'var(--text3)';
    const label = item.done && item.doneAt ? `Done ${item.doneAt}` : formatDue(item.dueDate);
    children.push(h('span', { style: { fontSize: '11px', color } }, label));
  }

  if (item.timeNeeded && !item.done) {
    children.push(h('span', { style: { fontSize: '11px', color: 'var(--text3)' } }, `· ${Math.round(item.timeNeeded / 60 * 10) / 10}h needed`));
  }

  if (item.recurrence) {
    const labels = { daily: 'Daily', weekly: 'Weekly', monthly: 'Monthly', yearly: 'Yearly' };
    children.push(h('span', { class: 'badge badge-recur' }, `↻ ${labels[item.recurrence] || item.recurrence}`));
  }

  // Show checklist progress so it's visible without expanding
  const cl = item.checklist || [];
  if (cl.length > 0) {
    const clDone = cl.filter(c => c.done).length;
    const allDone = clDone === cl.length;
    children.push(h('span', { class: `cl-meta-badge${allDone ? ' all-done' : ''}` }, `☑ ${clDone}/${cl.length}`));
  }

  const sessions = getItemSessions(item);
  if (sessions.length > 0) {
    const bookedMins = getBookedMins(item);
    const totalMins  = item.timeNeeded || 0;
    const label = sessions.length === 1
      ? `📅 ${sessions[0].day} ${sessions[0].start}–${sessions[0].end} ✎`
      : `📅 ${sessions.length} sessions · ${Math.round(bookedMins / 60 * 10) / 10}h booked ✎`;
    const incomplete = totalMins > 0 && bookedMins < totalMins;
    const fb = h('span', {
      class: `badge badge-focus focus-badge-clickable${incomplete ? ' badge-focus-incomplete' : ''}`,
      title: 'Click to change focus time',
      onClick: e => { e.stopPropagation(); toggleCard(item.id); },
    }, label);
    children.push(fb);
  }

  // Calendar time-pressure indicator — shown when task eats ≥25% of today's free time
  if (!item.done && S.calFreeMinutes > 0) {
    const pressure = getCalPressure(item, S.calFreeMinutes);
    if (pressure >= 0.25) {
      const pct = Math.min(999, Math.round(pressure * 100));
      children.push(h('span', {
        class: 'badge badge-cal-pressure',
        title: `Uses ~${pct}% of your free time today (${Math.round(S.calFreeMinutes / 60 * 10) / 10}h available)`,
      }, `⏱ ${pct}% of today`));
    }
  }

  return h('div', { class: 'card-meta' }, ...children);
}

function buildWorkflowMeta(item) {
  const tasks       = item.tasks || [];
  const activeTasks = tasks.filter(t => t.status === 'active');
  const closedCount = tasks.filter(t => t.status !== 'active').length;
  const children    = [];

  if (item.done) {
    // Closed workflow: surface reopen without requiring expand
    children.push(h('span', { class: 'badge', style: { background: '#EAF3DE', color: '#3B6D11' } }, '✓ Workflow closed'));
    children.push(h('button', {
      class: 'wf-reopen-inline-btn',
      onClick: e => { e.stopPropagation(); updateItem(item.id, { done: false }); },
    }, '↩ Reopen'));
    return h('div', { class: 'card-meta' }, ...children);
  }

  // Priority: competition-lifted when all items are low, otherwise highest active task
  const wfPriority = getEffectivePriority(item);
  const isComp     = isCompetitionPriority(item.id);
  if (wfPriority) children.push(priorityBadge(wfPriority, !isComp, isComp));

  if (tasks.length === 0) {
    children.push(h('span', { class: 'badge badge-awaiting' }, 'No tasks yet'));
  } else {
    const label = activeTasks.length === 0
      ? `All ${closedCount} task${closedCount !== 1 ? 's' : ''} done`
      : `${activeTasks.length} active${closedCount > 0 ? ` · ${closedCount} done` : ''}`;
    children.push(h('span', { class: 'badge badge-awaiting' }, label));
  }

  if (item.hasDueDate && item.dueDate) {
    const overdue = isOverdue(item.dueDate) && !item.done;
    children.push(h('span', { style: { fontSize: '11px', color: overdue ? '#A32D2D' : 'var(--text3)' } },
      `· ${formatDue(item.dueDate)}`));
  }

  return h('div', { class: 'card-meta' }, ...children);
}

// ── Notes + options toggle (bottom of expanded body) ─────────────────────────

function buildMoreContent(item) {
  const moreOpen    = !!S.moreOpenCards[item.id];
  const moreChildren = [];

  // Notes is shown inline in the task body for active tasks; show it here only for workflows
  if (item.type === 'workflow' && item.notes) {
    moreChildren.push(h('div', { style: { marginBottom: '10px' } },
      h('div', { class: 'exp-label' }, 'Notes'),
      h('div', { style: { fontSize: '13px', color: 'var(--text2)', lineHeight: '1.5' } }, item.notes),
    ));
  }

  moreChildren.push(h('div', { class: 'more-btn-row' },
    h('button', { class: 'btn-ghost btn-sm', onClick: () => startEdit(item.id) }, 'Edit'),
    h('button', {
      class: 'btn-ghost btn-sm',
      title: item.type === 'task' ? 'Convert to workflow' : 'Convert to task',
      onClick: () => convertItem(item.id),
    }, item.type === 'task' ? '⇄ Convert to workflow' : '⇄ Convert to task'),
  ));

  const label = item.type === 'task' ? 'Options' : 'Notes & options';
  return [
    h('button', { class: 'more-toggle', onClick: () => toggleMore(item.id) },
      (moreOpen ? '▲' : '▼') + ` ${label}`,
    ),
    h('div', { class: `more-content${moreOpen ? ' open' : ''}` }, ...moreChildren),
  ];
}

// ── Public: build a full card ─────────────────────────────────────────────────

export function buildCard(item, catId) {
  const expanded = !!S.expandedCards[item.id];
  const editing  = S.editingCards[item.id];
  const overdue  = isOverdue(item.dueDate) && !item.done;
  const draggable = S.view === 'category';

  const expandBtn = h('button', { class: `expand-btn${expanded ? ' open' : ''}`, onClick: e => { e.stopPropagation(); toggleCard(item.id); } },
    createSvg('10', '10', '0 0 10 10', '<path d="M2 3.5L5 6.5L8 3.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>'),
  );
  const editBtn = h('button', {
    class: 'card-action-btn',
    title: 'Edit',
    onClick: e => { e.stopPropagation(); startEdit(item.id); },
  }, createSvg('11', '11', '0 0 11 11',
    '<path d="M7.5 1.5l2 2L3 10H1V8L7.5 1.5Z" stroke="currentColor" stroke-width="1.2" fill="none" stroke-linejoin="round"/>' +
    '<path d="M6.5 2.5l2 2" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/>',
  ));
  const deleteBtn = h('button', {
    class: 'card-action-btn card-delete-btn',
    title: 'Delete',
    onClick: e => { e.stopPropagation(); deleteItem(item.id); },
  }, createSvg('11', '11', '0 0 11 11',
    '<path d="M2 3.5h7M4.5 3.5V2h2v1.5M3.5 3.5l.5 5h3l.5-5" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round" fill="none"/>',
  ));

  const handle = draggable
    ? h('span', { class: 'drag-handle' }, '⠿')
    : h('span', { class: 'drag-handle', style: { visibility: 'hidden' } });

  const icon = item.type === 'workflow'
    ? workflowIcon()
    : h('div', { class: `checkbox${item.done ? ' checked' : ''}`, onClick: e => { e.stopPropagation(); toggleDone(item.id); } }, item.done ? checkIcon() : null);

  const titleEl  = h('div', { class: `card-title${item.done ? ' strikethrough' : ''}` }, item.title);
  const cardTop  = h('div', { class: 'card-top', style: { cursor: 'pointer' } }, handle, icon, titleEl, editBtn, deleteBtn, expandBtn);
  const metaRow  = item.type === 'task' ? buildTaskMeta(item, overdue) : buildWorkflowMeta(item);

  // Dashboard + search: show category chip so the item's context is clear
  if (S.view === 'dashboard' || S.searchQuery) {
    // Search spans both panels so look up across all categories
    const allCats = [...(S.data.work?.categories || []), ...(S.data.life?.categories || [])];
    const cat = allCats.find(c => c.id === item.categoryId);
    if (cat) metaRow.appendChild(h('span', { class: 'cat-chip' }, cat.name));
  }

  let bodyChildren;
  if (editing) {
    bodyChildren = buildEditForm(item, editing);
  } else {
    const viewChildren = item.type === 'task'
      ? buildTaskBody(item, overdue)
      : buildWorkflowBody(item);
    bodyChildren = [...viewChildren, ...buildMoreContent(item)];
  }

  const body = h('div', { class: `expanded-body${expanded ? ' open' : ''}` }, ...bodyChildren.filter(Boolean));

  const attrs = {
    class: `task-card${item.type === 'workflow' ? ' workflow' : ''}${expanded ? ' expanded' : ''}${item.done ? ' done-card' : ''}${lastDroppedId === item.id ? ' just-dropped' : ''}${draggable ? '' : ' no-drag'}`,
    'data-id': item.id,
  };

  // Clicking anywhere on the collapsed card expands it; ignore interactive elements and the expanded body
  attrs.onClick = e => {
    if (e.target.closest('button, input, textarea, select, a, .checkbox, .wf-icon, .expanded-body')) return;
    toggleCard(item.id);
  };

  if (draggable) {
    attrs.draggable = 'true';
    attrs['data-cat'] = catId;
    attrs.onDragstart = e => {
      if (e.target.closest('input, textarea, select, [contenteditable]')) { e.preventDefault(); return; }
      onDragStart(e, item.id, catId);
    };
    attrs.onDragend   = onDragEnd;
    attrs.onDragover  = e => onDragOver(e, item.id);
    attrs.onDrop      = e => onDrop(e, item.id, catId);
  }

  return h('div', attrs, cardTop, metaRow, body);
}

// ── Public: render items grouped by due-date tier ─────────────────────────────

export function renderSections(items, catId, opts = {}) {
  const { hideDone = false } = opts;

  // Compute competition map before building any cards so all badges read consistent values
  setCompetitionMap(computeCompetitionMap(items, S.calFreeMinutes));

  const overdue  = items.filter(i => isOverdue(i.dueDate) && !i.done);
  const dueToday = items.filter(i => !isOverdue(i.dueDate) && i.dueDate === TODAY && !i.done);
  // Guard `i.dueDate &&` so empty-string dueDate doesn't match upcoming
  const upcoming = items.filter(i => i.dueDate && !isOverdue(i.dueDate) && i.dueDate !== TODAY && !i.done);
  const noDue    = items.filter(i => !i.dueDate && !i.done);
  const done     = items.filter(i => i.done);

  const frag = document.createDocumentFragment();
  const addSection = (label, sectionItems) => {
    if (!sectionItems.length) return;
    frag.appendChild(h('div', { class: 'group-label' }, label));
    sectionItems.forEach(item => frag.appendChild(buildCard(item, catId || item.categoryId)));
  };

  addSection('Overdue', overdue);
  addSection('Today', dueToday);
  addSection('Upcoming', upcoming);
  addSection('No due date', noDue);
  if (!hideDone) addSection('Completed', done);
  return frag;
}
