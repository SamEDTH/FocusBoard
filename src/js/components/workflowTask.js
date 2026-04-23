// Workflow task row rendering + the add-task form + the workflow expanded body.
// All workflow-specific UI lives here so card.js stays under the line limit.

import { S, set, updateItem } from '../store.js';
import {
  addWorkflowTask, updateWorkflowTask, deleteWorkflowTask, closeWorkflowTask,
  completeWorkflowTaskWithActions, completeWorkflowTaskWithSend,
  markSendAndStartWaiting,
  addWorkflowTaskFocusSession, removeWorkflowTaskFocusSession,
  addWfTaskChecklistItem, toggleWfTaskChecklistItem, deleteWfTaskChecklistItem,
} from '../workflowActions.js';
import { buildChecklist } from './taskBody.js';
import { daysBefore, normalizePriority, formatTime, formatDate, TODAY } from '../utils.js';
import { h, createSvg, buildPriorityPicker } from '../dom.js';
import { buildFocusPicker, getBookedMins } from './focusPicker.js';

// ── Focus picker toggle (inline pill list + add-session button) ───────────────

// Uses a virtual task object so buildFocusPicker doesn't need to know about
// the nested workflow→task structure; the _onBook hook routes saves correctly.
function buildWfFocusPickerToggle(workflow, wfTask) {
  const virtualTask = {
    id: `${workflow.id}::${wfTask.id}`,
    title: wfTask.title || 'Task',
    timeNeeded: wfTask.timeNeeded || 60,
    focusSessions: wfTask.focusSessions || [],
    _onBook: session => addWorkflowTaskFocusSession(workflow.id, wfTask.id, session),
  };

  const sessions   = wfTask.focusSessions || [];
  const hasSessions = sessions.length > 0;
  const bookedMins  = getBookedMins(virtualTask);
  const remaining   = Math.max(0, (wfTask.timeNeeded || 0) - bookedMins);
  const wrap = h('div', { class: 'focus-picker-wrap' });
  let pickerVisible = false;
  let pickerEl = null;

  if (hasSessions) {
    const pillsWrap = h('div', { class: 'focus-sessions' });
    sessions.forEach((s, i) => {
      pillsWrap.appendChild(h('div', { class: 'focus-pill' },
        h('span', { class: 'focus-pill-time' }, `${s.start} – ${s.end}`),
        h('span', { class: 'focus-pill-day' }, s.day),
        h('button', {
          class: 'focus-pill-remove',
          onClick: e => { e.stopPropagation(); removeWorkflowTaskFocusSession(workflow.id, wfTask.id, i); },
        }, '×'),
      ));
    });
    wrap.appendChild(pillsWrap);
    if (remaining > 0) wrap.appendChild(h('div', { class: 'fp-remaining' }, `${formatTime(remaining)} still unscheduled`));
  }

  const togglePicker = () => {
    if (pickerVisible) {
      pickerEl?.remove(); pickerEl = null; pickerVisible = false;
      actionBtn.textContent = hasSessions ? '+ Add session' : '+ Suggest focus block';
    } else {
      pickerEl = buildFocusPicker(virtualTask, () => { pickerEl?.remove(); pickerEl = null; pickerVisible = false; });
      wrap.appendChild(pickerEl); pickerVisible = true; actionBtn.textContent = '− Hide';
    }
  };
  const actionBtn = h('button', { class: 'suggest-btn' }, hasSessions ? '+ Add session' : '+ Suggest focus block');
  actionBtn.addEventListener('click', togglePicker);
  wrap.appendChild(actionBtn);
  return wrap;
}

// ── Action task body ──────────────────────────────────────────────────────────

function buildWfActionBody(workflow, task) {
  const roundToNearest15 = hrs => Math.max(15, Math.round(parseFloat(hrs) * 60 / 15) * 15) || 60;

  const dueDateIn = h('input', { class: 'wft-inline-input', type: 'date', value: task.dueDate || '' });
  dueDateIn.addEventListener('change', e => updateWorkflowTask(workflow.id, task.id, { dueDate: e.target.value }));

  const prioritySel = buildPriorityPicker(normalizePriority(task.priority), v => updateWorkflowTask(workflow.id, task.id, { priority: v }));

  const timeIn = h('input', { class: 'wft-inline-input wft-time-input', type: 'number', value: task.timeNeeded ? task.timeNeeded / 60 : 1, min: '0.25', step: '0.25' });
  timeIn.addEventListener('change', e => {
    updateWorkflowTask(workflow.id, task.id, { timeNeeded: roundToNearest15(e.target.value) });
  });

  const notesIn = h('textarea', { class: 'wft-notes-input', placeholder: 'Notes…', rows: '2' }, task.notes || '');
  notesIn.addEventListener('change', e => updateWorkflowTask(workflow.id, task.id, { notes: e.target.value }));

  return h('div', { class: 'wft-body' },
    h('div', { class: 'wft-body-fields' },
      h('div', { class: 'wft-body-field' }, h('span', { class: 'wft-field-label' }, 'Due'), dueDateIn),
      h('div', { class: 'wft-body-field wft-priority-field' }, h('span', { class: 'wft-field-label' }, 'Priority'), prioritySel),
      h('div', { class: 'wft-body-field' }, h('span', { class: 'wft-field-label' }, 'Time (hrs)'), timeIn),
    ),
    h('div', { class: 'wft-body-field wft-notes-field' }, h('span', { class: 'wft-field-label' }, 'Notes'), notesIn),
    buildWfFocusPickerToggle(workflow, task),
    buildChecklist(task.checklist, {
      onAdd:    title => addWfTaskChecklistItem(workflow.id, task.id, title),
      onToggle: id    => toggleWfTaskChecklistItem(workflow.id, task.id, id),
      onDelete: id    => deleteWfTaskChecklistItem(workflow.id, task.id, id),
    }),
  );
}

// ── Waiting task body ─────────────────────────────────────────────────────────

function buildWfWaitingBody(workflow, task) {
  const daysOut = task.waitingSince ? daysBefore(task.waitingSince) : null;
  // Prefer actual chase date (new model); fall back to old followUpDays for legacy data
  const chaseNeeded = task.chaseDate
    ? daysBefore(task.chaseDate) >= 0
    : (daysOut !== null && daysOut >= (task.followUpDays || 5));

  const waitingFromIn = h('input', { class: 'wft-inline-input', value: task.waitingFrom || '', placeholder: 'Who or what are you waiting on?' });
  waitingFromIn.addEventListener('change', e => updateWorkflowTask(workflow.id, task.id, { waitingFrom: e.target.value.trim() }));

  const targetReturnIn = h('input', { class: 'wft-inline-input', type: 'date', value: task.targetReturnDate || '' });
  targetReturnIn.addEventListener('change', e => updateWorkflowTask(workflow.id, task.id, { targetReturnDate: e.target.value }));

  const chaseDateIn = h('input', { class: 'wft-inline-input', type: 'date', value: task.chaseDate || '' });
  chaseDateIn.addEventListener('change', e => updateWorkflowTask(workflow.id, task.id, { chaseDate: e.target.value }));

  const notesIn = h('textarea', { class: 'wft-notes-input', placeholder: 'Notes…', rows: '2' }, task.notes || '');
  notesIn.addEventListener('change', e => updateWorkflowTask(workflow.id, task.id, { notes: e.target.value }));

  // Stagnation bar: show days waiting + a badge when the chase date has passed
  let stagnationContent = null;
  if (daysOut !== null) {
    const parts = [h('span', { class: 'wft-days-out' }, `${daysOut} day${daysOut !== 1 ? 's' : ''} waiting`)];
    if (chaseNeeded) {
      parts.push(h('span', { class: 'badge badge-timer' }, '⚡ Chase due'));
    } else if (task.chaseDate) {
      const dLeft = -daysBefore(task.chaseDate);
      parts.push(h('span', { class: 'wft-field-label' }, `· chase in ${dLeft} day${dLeft !== 1 ? 's' : ''}`));
    }
    stagnationContent = h('div', { class: `wft-stagnation${chaseNeeded ? ' chase-due' : ''}` }, ...parts);
  }

  // Chase now → close waiting, open a chase-send task; Response received → close waiting, open follow-on picker
  const chaseBtn = h('button', {
    class: 'wft-send-btn',
    title: 'Chase — closes this task and creates a Chase task',
    onClick: () => completeWorkflowTaskWithSend(workflow.id, task.id),
  }, '📤 Chase now');

  const receivedBtn = h('button', {
    class: 'wft-close-btn',
    title: 'Response received — closes this task and opens a new task',
    onClick: () => completeWorkflowTaskWithActions(workflow.id, task.id),
  }, '✓ Response received');

  return h('div', { class: 'wft-body' },
    h('div', { class: 'wft-body-fields' },
      h('div', { class: 'wft-body-field' }, h('span', { class: 'wft-field-label' }, 'Waiting on'), waitingFromIn),
      h('div', { class: 'wft-body-field' }, h('span', { class: 'wft-field-label' }, 'Target return date'), targetReturnIn),
      h('div', { class: 'wft-body-field' }, h('span', { class: 'wft-field-label' }, 'Follow-up / chase date'), chaseDateIn),
    ),
    stagnationContent,
    h('div', { class: 'wft-body-field wft-notes-field' }, h('span', { class: 'wft-field-label' }, 'Notes'), notesIn),
    buildChecklist(task.checklist, {
      onAdd:    title => addWfTaskChecklistItem(workflow.id, task.id, title),
      onToggle: id    => toggleWfTaskChecklistItem(workflow.id, task.id, id),
      onDelete: id    => deleteWfTaskChecklistItem(workflow.id, task.id, id),
    }),
    h('div', { class: 'wft-waiting-actions' }, chaseBtn, receivedBtn),
  );
}

// ── Workflow task row ─────────────────────────────────────────────────────────

export function buildWfTaskRow(workflow, task) {
  const isActive = task.status === 'active';

  // ── Pending: inline nature picker (spawned from "More to do") ────────────
  if (isActive && task.nature === 'pending') {
    let chosenNature = 'action';
    let title = '';

    const actionBtn = h('button', { class: 'wft-nature-pick active' }, '▶ Action');
    const waitingBtn = h('button', { class: 'wft-nature-pick' }, '⏳ Waiting');

    actionBtn.addEventListener('click', () => {
      chosenNature = 'action';
      actionBtn.classList.add('active'); waitingBtn.classList.remove('active');
    });
    waitingBtn.addEventListener('click', () => {
      chosenNature = 'waiting';
      waitingBtn.classList.add('active'); actionBtn.classList.remove('active');
    });

    const titleIn = h('input', { class: 'wft-add-input wft-add-title', placeholder: 'Task title' });
    titleIn.addEventListener('input', e => { title = e.target.value; });

    const confirmBtn = h('button', { class: 'btn-dark btn-sm', onClick: () => {
      if (!title.trim()) { titleIn.focus(); return; }
      updateWorkflowTask(workflow.id, task.id, {
        nature: chosenNature,
        title: title.trim(),
        // waitingSince marks when the wait started, not applicable to actions
        waitingSince: chosenNature === 'waiting' ? TODAY : '',
      });
    }}, 'Confirm');

    const cancelBtn = h('button', { class: 'btn-ghost btn-sm', onClick: () => deleteWorkflowTask(workflow.id, task.id) }, 'Cancel');

    const row = h('div', { class: 'wft-row wft-pending' },
      h('div', { class: 'wft-pending-label' }, '↪ Follow-on task'),
      h('div', { class: 'wft-nature-picker' }, actionBtn, waitingBtn),
      titleIn,
      h('div', { class: 'wft-add-actions' }, confirmBtn, cancelBtn),
    );
    setTimeout(() => titleIn.focus(), 0);
    return row;
  }

  // ── Send / Chase task row ─────────────────────────────────────────────────
  if (isActive && task.nature === 'send') {
    const isChase      = !!task.isChase;
    const displayTitle = isChase ? `Chase '${task.title}'` : `Send '${task.title}'`;
    const badge        = isChase ? '📤 Chase' : '📤 Send';

    // For a chase, inherit the previous waiting task's target return date as default
    let waitingFrom       = task.waitingFrom || '';
    let targetReturnDate  = task.inheritedTargetReturnDate || '';
    let chaseDate         = '';

    const formWrap = h('div', { class: 'wft-send-form', style: { display: 'none' } });

    const waitingFromIn = h('input', { class: 'wft-add-input wft-add-input-wide', placeholder: 'Who are you waiting on?', value: waitingFrom });
    waitingFromIn.addEventListener('input', e => { waitingFrom = e.target.value; });

    const targetReturnIn = h('input', { type: 'date', class: 'wft-add-input', value: targetReturnDate });
    targetReturnIn.addEventListener('input', e => { targetReturnDate = e.target.value; });

    const chaseDateIn = h('input', { type: 'date', class: 'wft-add-input', value: chaseDate });
    chaseDateIn.addEventListener('input', e => { chaseDate = e.target.value; });

    const confirmBtn = h('button', { class: 'btn-dark btn-sm', onClick: () => {
      markSendAndStartWaiting(workflow.id, task.id, waitingFrom, targetReturnDate, chaseDate);
    }}, '✓ Confirm & start waiting');

    const cancelBtn = h('button', { class: 'btn-ghost btn-sm', onClick: () => {
      formWrap.style.display = 'none';
      sentBtn.style.display = '';
    }}, 'Cancel');

    formWrap.appendChild(h('div', { class: 'wft-send-chase-form' },
      h('div', { class: 'wft-field-label', style: { marginBottom: '6px' } }, 'Set up waiting task'),
      h('div', { class: 'wft-add-row' },
        h('div', { class: 'wft-add-field wft-add-field-wide' }, h('span', { class: 'wft-field-label' }, 'Waiting on'), waitingFromIn),
      ),
      h('div', { class: 'wft-add-row' },
        h('div', { class: 'wft-add-field' }, h('span', { class: 'wft-field-label' }, 'Target return date'), targetReturnIn),
        h('div', { class: 'wft-add-field' }, h('span', { class: 'wft-field-label' }, 'Follow-up / chase date'), chaseDateIn),
      ),
      h('div', { class: 'wft-add-actions', style: { marginTop: '8px' } }, confirmBtn, cancelBtn),
    ));

    const sentBtn = h('button', { class: 'wft-sent-btn', onClick: () => {
      sentBtn.style.display = 'none';
      formWrap.style.display = '';
      waitingFromIn.focus();
    }}, isChase ? '✓ Mark as chased' : '✓ Mark as sent');

    const delBtn = h('button', {
      class: 'wft-del-btn',
      title: 'Delete',
      onClick: e => { e.stopPropagation(); deleteWorkflowTask(workflow.id, task.id); },
    }, '×');

    return h('div', { class: 'wft-row wft-send-row' },
      h('div', { class: 'wft-send-header' },
        h('span', { class: 'wft-send-badge' }, badge),
        h('span', { class: 'wft-send-title' }, displayTitle),
        h('div', { class: 'wft-header-actions' }, sentBtn, delBtn),
      ),
      formWrap,
    );
  }

  // ── Closed / completed row (compact struck-through) ───────────────────────
  if (!isActive) {
    const statusIcon  = task.status === 'closed' ? '✓' : '↪';
    const statusClass = task.status === 'closed' ? 'wft-icon-closed' : 'wft-icon-done-new';
    const natureLabel = task.nature === 'action' ? 'Action' : 'Waiting';
    const reopenBtn = h('button', {
      class: 'wft-reopen-btn',
      title: 'Reopen task',
      onClick: () => updateWorkflowTask(workflow.id, task.id, { status: 'active', closedAt: null }),
    }, 'Reopen');

    return h('div', { class: 'wft-row wft-closed' },
      h('span', { class: `wft-status-dot ${statusClass}` }, statusIcon),
      h('span', { class: 'wft-closed-nature' }, natureLabel),
      h('span', { class: 'wft-closed-title' }, task.title || '(untitled)'),
      task.closedAt ? h('span', { class: 'wft-closed-date' }, task.closedAt) : null,
      reopenBtn,
    );
  }

  // ── Active task row (expand/collapse) ─────────────────────────────────────
  // Composite key so workflow task expand state doesn't collide with card expand state
  const stateKey = `wft::${workflow.id}::${task.id}`;
  const expanded = S.expandedCards[stateKey] !== false; // default: expanded

  const isAction    = task.nature === 'action';
  const natureLabel = isAction ? '▶ Action' : '⏳ Waiting';

  const natureBadge = h('span', { class: `wft-nature-badge ${isAction ? 'wft-action' : 'wft-waiting'}` },
    natureLabel,
  );

  const titleInput = h('input', { class: 'wft-title-input', value: task.title, placeholder: 'Task title…' });
  titleInput.addEventListener('change', e => updateWorkflowTask(workflow.id, task.id, { title: e.target.value.trim() }));

  // Show checklist progress in the header so it's visible even when collapsed
  const cl = task.checklist || [];
  const clDone = cl.filter(c => c.done).length;
  const clBadge = cl.length > 0
    ? h('span', { class: `wft-cl-badge${clDone === cl.length ? ' all-done' : ''}` }, `${clDone}/${cl.length} ✓`)
    : null;

  const closeBtn = h('button', {
    class: 'wft-close-btn',
    title: 'Mark complete — no follow-up',
    onClick: e => { e.stopPropagation(); closeWorkflowTask(workflow.id, task.id); },
  }, '✓ Complete');

  const sendBtn = h('button', {
    class: 'wft-send-btn',
    title: 'Send — creates a sent tick and waiting task',
    onClick: e => { e.stopPropagation(); completeWorkflowTaskWithSend(workflow.id, task.id); },
  }, '📤 Send');

  const doneNewBtn = h('button', {
    class: 'wft-done-new-btn',
    title: 'Done — opens follow-on task picker',
    onClick: e => { e.stopPropagation(); completeWorkflowTaskWithActions(workflow.id, task.id); },
  }, '↪ More to do');

  const delBtn = h('button', {
    class: 'wft-del-btn',
    title: 'Delete task',
    onClick: e => { e.stopPropagation(); deleteWorkflowTask(workflow.id, task.id); },
  }, '×');

  const toggleBtn = h('button', {
    class: `wft-toggle-btn${expanded ? ' open' : ''}`,
    onClick: e => {
      e.stopPropagation();
      const ec = { ...S.expandedCards };
      ec[stateKey] = !expanded;
      set({ expandedCards: ec });
    },
  }, createSvg('10', '10', '0 0 10 10', '<path d="M2 3.5L5 6.5L8 3.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>'));

  const header = h('div', { class: 'wft-header' },
    natureBadge,
    titleInput,
    clBadge,
    h('div', { class: 'wft-header-actions' }, closeBtn, sendBtn, doneNewBtn, delBtn),
    toggleBtn,
  );

  const body = h('div', { class: `wft-body-wrap${expanded ? ' open' : ''}` });
  if (expanded) {
    body.appendChild(isAction ? buildWfActionBody(workflow, task) : buildWfWaitingBody(workflow, task));
  }

  return h('div', { class: `wft-row wft-active${!isAction ? ' wft-waiting-row' : ''}` }, header, body);
}

// ── Add workflow task form ────────────────────────────────────────────────────

function buildAddWfTaskForm(workflow, container) {
  let nature = 'action';
  let title = '';
  let dueDate = '';
  let priority = 5;
  let timeHrs = '1';
  let waitingFrom = '';
  let followUpDays = '5';

  const actionBtn  = h('button', { class: 'wft-nature-pick active' }, '▶ Action');
  const waitingBtn = h('button', { class: 'wft-nature-pick' }, '⏳ Waiting');

  const actionFields  = h('div', { class: 'wft-add-extra' });
  const waitingFields = h('div', { class: 'wft-add-extra', style: { display: 'none' } });

  const dueDateIn = h('input', { type: 'date', class: 'wft-add-input', value: '' });
  dueDateIn.addEventListener('change', e => { dueDate = e.target.value; });

  const prioritySel = buildPriorityPicker(5, v => { priority = v; });

  const timeIn = h('input', { type: 'number', class: 'wft-add-input wft-add-input-sm', value: '1', min: '0.25', step: '0.25' });
  timeIn.addEventListener('input', e => { timeHrs = e.target.value; });

  actionFields.appendChild(h('div', { class: 'wft-add-rows' },
    h('div', { class: 'wft-add-row' },
      h('div', { class: 'wft-add-field' }, h('span', { class: 'wft-field-label' }, 'Due'), dueDateIn),
      h('div', { class: 'wft-add-field' }, h('span', { class: 'wft-field-label' }, 'Time (hrs)'), timeIn),
    ),
    h('div', { class: 'wft-add-field wft-priority-field' }, h('span', { class: 'wft-field-label' }, 'Default priority'), prioritySel),
  ));

  const waitingFromIn = h('input', { class: 'wft-add-input wft-add-input-wide', placeholder: 'Who or what are you waiting on?' });
  waitingFromIn.addEventListener('input', e => { waitingFrom = e.target.value; });

  const followUpIn = h('input', { type: 'number', class: 'wft-add-input wft-add-input-sm', value: '5', min: '1' });
  followUpIn.addEventListener('input', e => { followUpDays = e.target.value; });

  waitingFields.appendChild(h('div', { class: 'wft-add-row' },
    h('div', { class: 'wft-add-field' }, h('span', { class: 'wft-field-label' }, 'Waiting on'), waitingFromIn),
    h('div', { class: 'wft-add-field' }, h('span', { class: 'wft-field-label' }, 'Chase after (days)'), followUpIn),
  ));

  actionBtn.addEventListener('click', () => {
    nature = 'action';
    actionBtn.classList.add('active'); waitingBtn.classList.remove('active');
    actionFields.style.display = ''; waitingFields.style.display = 'none';
  });
  waitingBtn.addEventListener('click', () => {
    nature = 'waiting';
    waitingBtn.classList.add('active'); actionBtn.classList.remove('active');
    waitingFields.style.display = ''; actionFields.style.display = 'none';
  });

  const titleIn = h('input', { class: 'wft-add-input wft-add-title', placeholder: 'Task title' });
  titleIn.addEventListener('input', e => { title = e.target.value; });

  const addBtn = h('button', { class: 'btn-dark btn-sm', onClick: () => {
    if (!title.trim()) { titleIn.focus(); return; }
    const mins = Math.max(15, Math.round(parseFloat(timeHrs) * 60 / 15) * 15) || 60;
    addWorkflowTask(workflow.id, {
      nature,
      title: title.trim(),
      dueDate:      nature === 'action'  ? dueDate : '',
      priority:     nature === 'action'  ? priority : '',
      timeNeeded:   nature === 'action'  ? mins : 0,
      waitingFrom:  nature === 'waiting' ? waitingFrom.trim() : '',
      followUpDays: nature === 'waiting' ? (parseInt(followUpDays) || 5) : 5,
      waitingSince: nature === 'waiting' ? TODAY : '',
    });
  }}, '+ Add task');

  const cancelBtn = h('button', { class: 'btn-ghost btn-sm', onClick: () => form.remove() }, 'Cancel');

  const form = h('div', { class: 'wft-add-form' },
    h('div', { class: 'wft-add-row wft-add-top' },
      h('div', { class: 'wft-nature-picker' }, actionBtn, waitingBtn),
    ),
    h('div', { class: 'wft-add-field wft-add-title-field' }, titleIn),
    actionFields,
    waitingFields,
    h('div', { class: 'wft-add-actions' }, addBtn, cancelBtn),
  );
  container.appendChild(form);
  titleIn.focus();
}

// ── Workflow expanded body ────────────────────────────────────────────────────

export function buildWorkflowBody(item) {
  const tasks       = item.tasks || [];
  const activeTasks = tasks.filter(t => t.status === 'active');
  const closedTasks = tasks.filter(t => t.status !== 'active');

  // Optional due date — toggled via checkbox, not always present on workflows
  const hasDueDateCb = h('input', { type: 'checkbox', id: `wf-dd-${item.id}`, checked: !!item.hasDueDate });
  hasDueDateCb.addEventListener('change', e => {
    updateItem(item.id, { hasDueDate: e.target.checked, dueDate: e.target.checked ? (item.dueDate || '') : '' });
  });

  let dueDateSection = null;
  if (item.hasDueDate) {
    const ddIn = h('input', { class: 'wft-inline-input', type: 'date', value: item.dueDate || '' });
    ddIn.addEventListener('change', e => updateItem(item.id, { dueDate: e.target.value }));
    dueDateSection = h('div', { class: 'wf-due-row' },
      h('span', { class: 'wft-field-label' }, 'Due date'),
      ddIn,
    );
  }

  const dueDateRow = h('div', { class: 'wf-due-option' },
    h('label', { class: 'wf-due-label', htmlFor: `wf-dd-${item.id}` }, hasDueDateCb, 'This workflow has a due date'),
    dueDateSection,
  );

  const taskList = h('div', { class: 'wft-list' });
  activeTasks.forEach(task => taskList.appendChild(buildWfTaskRow(item, task)));

  if (closedTasks.length > 0) {
    const closedWrap = h('div', { class: 'wft-closed-section' },
      h('div', { class: 'wft-closed-header' }, `${closedTasks.length} completed`),
    );
    closedTasks.forEach(task => closedWrap.appendChild(buildWfTaskRow(item, task)));
    taskList.appendChild(closedWrap);
  }

  if (tasks.length === 0) {
    taskList.appendChild(h('div', { class: 'wft-empty' }, 'No tasks yet — add one below'));
  }

  const addTaskBtn = h('button', { class: 'wft-add-btn' }, '+ Add task');
  addTaskBtn.addEventListener('click', () => {
    addTaskBtn.style.display = 'none';
    buildAddWfTaskForm(item, taskList);
    taskList.appendChild(addTaskBtn);
    addTaskBtn.style.display = '';
  });

  const closeWfBtn = h('button', {
    class: 'wf-close-btn',
    onClick: () => updateItem(item.id, { done: !item.done }),
  }, item.done ? '↩ Reopen workflow' : '✓ Close workflow');

  return [
    dueDateRow,
    h('div', { class: 'wf-section-label' }, 'Tasks'),
    taskList,
    addTaskBtn,
    h('div', { class: 'wf-footer-row' }, closeWfBtn),
  ];
}
