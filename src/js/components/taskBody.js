// Task expanded-body view and inline edit form.
// Kept separate from card.js so workflow UI can live in its own module.

import { saveEdit, cancelEdit, removeFocusSession, toggleCard, updateItem, S } from '../store.js';
import { addChecklistItem, toggleChecklistItem, deleteChecklistItem } from '../workflowActions.js';
import { computePriority, isPriorityAuto, getPriorityColor, normalizePriority, formatDate, formatTime, getEffectivePriority, isCompetitionPriority, daysBefore, computeChaseDate } from '../utils.js';
import { buildFocusPicker, getItemSessions, getBookedMins } from './focusPicker.js';
import { h, expField, buildPriorityPicker, customSelect } from '../dom.js';

const RECUR_OPTIONS = [
  { v: '',        l: 'No repeat' },
  { v: 'daily',   l: 'Daily' },
  { v: 'weekly',  l: 'Weekly' },
  { v: 'monthly', l: 'Monthly' },
  { v: 'yearly',  l: 'Yearly' },
];

// ── Shared checklist builder ──────────────────────────────────────────────────
// Exported so workflowTask.js can reuse it for workflow task bodies.
// Callbacks abstract the store calls so the builder stays store-agnostic.
//   onAdd(title)  — persist a new item
//   onToggle(id)  — flip done state
//   onDelete(id)  — remove item

export function buildChecklist(checklist, { onAdd, onToggle, onDelete }) {
  const list  = checklist || [];
  const done  = list.filter(c => c.done).length;
  const total = list.length;

  const itemsWrap = h('div', { class: 'cl-items' });
  list.forEach(c => {
    const cb = h('input', { type: 'checkbox', class: 'cl-check', checked: c.done });
    cb.addEventListener('change', e => { e.stopPropagation(); onToggle(c.id); });
    itemsWrap.appendChild(h('div', { class: `cl-item${c.done ? ' done' : ''}` },
      cb,
      h('span', { class: 'cl-title' }, c.title),
      h('button', { class: 'cl-del', title: 'Remove', onClick: e => { e.stopPropagation(); onDelete(c.id); } }, '×'),
    ));
  });

  // Enter key adds; blur does not — avoids accidental adds when tabbing away
  const addInput = h('input', { class: 'cl-add-input', placeholder: 'Add subtask…', type: 'text' });
  const addBtn   = h('button', { class: 'cl-add-btn' }, '+');
  const doAdd = () => {
    const val = addInput.value.trim();
    if (val) { addInput.value = ''; onAdd(val); }
  };
  addInput.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); doAdd(); } });
  addBtn.addEventListener('click', doAdd);

  const header = h('div', { class: 'cl-header' },
    h('span', { class: 'cl-label' }, 'Subtasks'),
    total > 0 ? h('span', { class: `cl-progress${done === total ? ' all-done' : ''}` }, `${done}/${total}`) : null,
  );

  return h('div', { class: 'cl-wrap' },
    header,
    itemsWrap,
    h('div', { class: 'cl-add-row' }, addInput, addBtn),
  );
}

// ── Inline edit form ──────────────────────────────────────────────────────────

// `editing` is the live object from S.editingCards[id] — mutations here are
// reflected directly in state without an extra set() call.
export function buildEditForm(item, editing) {
  const roundToNearest15 = hrs => Math.max(15, Math.round(parseFloat(hrs) * 60 / 15) * 15) || 60;
  const isWorkflow = item.type === 'workflow';

  const makeInput = (type, val, key) => {
    const isTime = key === 'timeNeeded';
    const displayVal = isTime ? (val ? val / 60 : 1) : val;
    const attrs = { class: 'edit-input', type, value: displayVal };
    if (isTime) { attrs.step = '0.25'; attrs.min = '0.25'; }
    const input = h('input', attrs);
    input.addEventListener('input', e => {
      editing[key] = isTime ? roundToNearest15(e.target.value) : (type === 'number' ? (parseInt(e.target.value) || 0) : e.target.value);
    });
    return input;
  };

  const ef = (lbl, input) => h('div', { class: 'edit-field' }, h('div', { class: 'edit-field-label' }, lbl), input);
  const ta = h('textarea', { class: 'edit-input', rows: '2', style: { lineHeight: '1.5' } }, editing.notes || '');
  ta.addEventListener('input', e => { editing.notes = e.target.value; });

  if (isWorkflow) {
    // Workflows expose only title + notes — due date is managed via the checkbox in the body
    return [
      h('div', { class: 'edit-grid', style: { gridTemplateColumns: '1fr' } },
        ef('Title', makeInput('text', editing.title, 'title')),
      ),
      h('div', { class: 'edit-field', style: { marginBottom: '10px' } }, h('div', { class: 'edit-field-label' }, 'Notes'), ta),
      h('div', { class: 'edit-actions' },
        h('button', { class: 'btn-dark btn-sm', onClick: () => saveEdit(item.id) }, 'Save'),
        h('button', { class: 'btn-ghost btn-sm', onClick: () => cancelEdit(item.id) }, 'Cancel'),
      ),
    ];
  }

  return [
    h('div', { class: 'edit-grid' },
      ef('Title', makeInput('text', editing.title, 'title')),
      ef('Due date', makeInput('date', editing.dueDate, 'dueDate')),
      ef('Time (hrs)', makeInput('number', editing.timeNeeded, 'timeNeeded')),
    ),
    h('div', { class: 'edit-field', style: { marginBottom: '8px' } },
      h('div', { class: 'edit-field-label' }, 'Default priority (used when no due date / time set)'),
      buildPriorityPicker(normalizePriority(editing.priority), v => { editing.priority = v; }),
    ),
    h('div', { class: 'edit-field', style: { marginBottom: '8px' } },
      h('div', { class: 'edit-field-label' }, 'Repeat'),
      customSelect(RECUR_OPTIONS, editing.recurrence || '', v => { editing.recurrence = v; }),
    ),
    h('div', { class: 'edit-field', style: { marginBottom: '10px' } }, h('div', { class: 'edit-field-label' }, 'Notes'), ta),
    h('div', { class: 'edit-actions' },
      h('button', { class: 'btn-dark btn-sm', onClick: () => saveEdit(item.id) }, 'Save'),
      h('button', { class: 'btn-ghost btn-sm', onClick: () => cancelEdit(item.id) }, 'Cancel'),
    ),
  ];
}

// ── Task expanded body ────────────────────────────────────────────────────────

export function buildTaskBody(item, overdue) {
  const roundToNearest15 = hrs => Math.max(15, Math.round(parseFloat(hrs) * 60 / 15) * 15) || 60;

  const sessions    = getItemSessions(item);
  const hasSessions = sessions.length > 0;
  const bookedMins  = getBookedMins(item);
  const totalMins   = item.timeNeeded || 0;
  const remaining   = Math.max(0, totalMins - bookedMins);

  const children = [];

  if (!item.done) {
    const notesIn = h('textarea', { class: 'wft-notes-input', placeholder: 'Notes…', rows: '2' }, item.notes || '');
    notesIn.addEventListener('change', e => updateItem(item.id, { notes: e.target.value }));

    if (item.nature === 'waiting') {
      // Waiting task: show waiting-specific fields
      const daysOut = item.waitingSince ? daysBefore(item.waitingSince) : null;
      const chaseNeeded = item.chaseDate
        ? daysBefore(item.chaseDate) >= 0
        : false;

      const waitingFromIn = h('input', { class: 'wft-inline-input', value: item.waitingFrom || '', placeholder: 'Who or what?' });
      waitingFromIn.addEventListener('change', e => updateItem(item.id, { waitingFrom: e.target.value.trim() }));

      const chaseDateIn = h('input', { class: 'wft-inline-input', type: 'date', value: item.chaseDate || '' });
      chaseDateIn.addEventListener('change', e => updateItem(item.id, { chaseDate: e.target.value }));

      const targetReturnIn = h('input', { class: 'wft-inline-input', type: 'date', value: item.targetReturnDate || '' });
      targetReturnIn.addEventListener('change', e => {
        const auto = computeChaseDate(e.target.value, S.followUpDays);
        // Only auto-set if chase date is currently blank
        if (!item.chaseDate) {
          chaseDateIn.value = auto;
          updateItem(item.id, { targetReturnDate: e.target.value, chaseDate: auto });
        } else {
          updateItem(item.id, { targetReturnDate: e.target.value });
        }
      });

      let stagnationEl = null;
      if (daysOut !== null) {
        const parts = [h('span', { class: 'wft-days-out' }, `${daysOut} day${daysOut !== 1 ? 's' : ''} waiting`)];
        if (chaseNeeded) parts.push(h('span', { class: 'badge badge-timer' }, '⚡ Chase due'));
        else if (item.chaseDate) {
          const dLeft = -daysBefore(item.chaseDate);
          parts.push(h('span', { class: 'wft-field-label' }, `· chase in ${dLeft} day${dLeft !== 1 ? 's' : ''}`));
        }
        stagnationEl = h('div', { class: `wft-stagnation${chaseNeeded ? ' chase-due' : ''}` }, ...parts);
      }

      children.push(
        h('div', { class: 'wft-body-fields' },
          h('div', { class: 'wft-body-field' }, h('span', { class: 'wft-field-label' }, 'Waiting on'), waitingFromIn),
          h('div', { class: 'wft-body-field' }, h('span', { class: 'wft-field-label' }, 'Target return'), targetReturnIn),
          h('div', { class: 'wft-body-field' }, h('span', { class: 'wft-field-label' }, 'Chase date'), chaseDateIn),
        ),
        stagnationEl,
        h('div', { class: 'wft-body-field wft-notes-field' }, h('span', { class: 'wft-field-label' }, 'Notes'), notesIn),
      );
    } else {
      // Action task: due, priority, time, notes
      const dueDateIn = h('input', { class: 'wft-inline-input', type: 'date', value: item.dueDate || '' });
      dueDateIn.addEventListener('change', e => updateItem(item.id, { dueDate: e.target.value }));

      const prioritySel = buildPriorityPicker(normalizePriority(item.priority), v => updateItem(item.id, { priority: v }));

      const timeIn = h('input', { class: 'wft-inline-input wft-time-input', type: 'number', value: item.timeNeeded ? item.timeNeeded / 60 : 1, min: '0.25', step: '0.25' });
      timeIn.addEventListener('change', e => updateItem(item.id, { timeNeeded: roundToNearest15(e.target.value) }));

      children.push(
        h('div', { class: 'wft-body-fields' },
          h('div', { class: 'wft-body-field' }, h('span', { class: 'wft-field-label' }, 'Due'), dueDateIn),
          h('div', { class: 'wft-body-field wft-priority-field' }, h('span', { class: 'wft-field-label' }, 'Priority'), prioritySel),
          h('div', { class: 'wft-body-field' }, h('span', { class: 'wft-field-label' }, 'Time (hrs)'), timeIn),
        ),
        h('div', { class: 'wft-body-field wft-notes-field' }, h('span', { class: 'wft-field-label' }, 'Notes'), notesIn),
      );
    }

    // Focus picker
    const container = h('div', { class: 'focus-picker-wrap' });
    let pickerVisible = false;
    let pickerEl = null;

    if (hasSessions) {
      const pillsWrap = h('div', { class: 'focus-sessions' });
      sessions.forEach((s, i) => {
        const sync   = S.focusSyncMap?.[item.id]?.[i];
        const status = sync?.status;   // 'ok' | 'cancelled' | 'rescheduled' | 'past' | undefined

        let pillCls = 'focus-pill';
        let badge   = null;
        let hint    = null;

        if (status === 'cancelled') {
          pillCls += ' focus-pill-conflict';
          badge    = h('span', { class: 'fp-sync-badge fp-sync-warn', title: 'This focus block no longer appears in your calendar — it may have been overridden' }, '⚠');
          hint     = h('span', { class: 'fp-sync-hint' }, 'Not in calendar');
        } else if (status === 'rescheduled') {
          pillCls += ' focus-pill-rescheduled';
          badge    = h('span', { class: 'fp-sync-badge fp-sync-info', title: `Detected at ${sync.newStart} – ${sync.newEnd} in your calendar` }, '🔄');
          hint     = h('span', { class: 'fp-sync-hint' }, `Now ${sync.newStart} – ${sync.newEnd}`);
        }

        const pillChildren = [
          h('span', { class: 'focus-pill-time' }, `${s.start} – ${s.end}`),
          h('span', { class: 'focus-pill-day' }, s.day),
          badge,
          hint,
          h('button', {
            class: 'focus-pill-remove',
            title: 'Remove session',
            onClick: e => { e.stopPropagation(); removeFocusSession(item.id, i); },
          }, '×'),
        ].filter(Boolean);
        const pill = h('div', { class: pillCls });
        pillChildren.forEach(c => pill.appendChild(c));
        pillsWrap.appendChild(pill);
      });
      container.appendChild(pillsWrap);
      if (remaining > 0) container.appendChild(h('div', { class: 'fp-remaining' }, `${formatTime(remaining)} still unscheduled`));
    }

    const togglePicker = () => {
      if (pickerVisible) {
        pickerEl?.remove(); pickerEl = null; pickerVisible = false;
        actionBtn.textContent = hasSessions ? '+ Add another session' : '+ Suggest focus block';
      } else {
        pickerEl = buildFocusPicker(item, () => { pickerEl?.remove(); pickerEl = null; pickerVisible = false; });
        container.appendChild(pickerEl); pickerVisible = true; actionBtn.textContent = '− Hide';
      }
    };

    const actionBtn = h('button', { class: 'suggest-btn' }, hasSessions ? '+ Add another session' : '+ Suggest focus block');
    actionBtn.addEventListener('click', togglePicker);
    container.appendChild(actionBtn);
    children.push(container);

  } else {
    // Done items: read-only summary
    const eff    = getEffectivePriority(item);
    const isComp = isCompetitionPriority(item.id);
    const auto   = !isComp && isPriorityAuto(item);
    const color  = getPriorityColor(eff);
    const suffix = isComp ? ' ↑' : auto ? ' ⚡' : '';
    const mode   = isComp ? 'competition' : auto ? 'auto' : 'manual';

    const priorityEl = h('div', null,
      h('div', { class: 'exp-label' }, 'Priority'),
      h('div', { class: 'exp-value', style: { color, fontWeight: '600' } },
        `P${eff}${suffix}`,
        h('span', { style: { fontWeight: '400', color: 'var(--text4)', fontSize: '11px', marginLeft: '5px' } }, mode),
      ),
    );

    children.push(h('div', { class: 'exp-grid' },
      expField('Due', item.dueDate ? formatDate(item.dueDate) : '—', overdue ? 'overdue' : ''),
      expField('Time needed', formatTime(item.timeNeeded)),
      priorityEl,
    ));

    if (item.notes) {
      children.push(h('div', { style: { marginBottom: '10px' } },
        h('div', { class: 'exp-label' }, 'Notes'),
        h('div', { style: { fontSize: '13px', color: 'var(--text2)', lineHeight: '1.5' } }, item.notes),
      ));
    }

    if (hasSessions) {
      const pillsWrap = h('div', { class: 'focus-sessions' });
      sessions.forEach(s => {
        pillsWrap.appendChild(h('div', { class: 'focus-pill' },
          h('span', { class: 'focus-pill-time' }, `${s.start} – ${s.end}`),
          h('span', { class: 'focus-pill-day' }, s.day),
        ));
      });
      children.push(pillsWrap);
    }
  }

  // Checklist shown on both active and done tasks
  children.push(buildChecklist(item.checklist, {
    onAdd:    title => addChecklistItem(item.id, title),
    onToggle: id    => toggleChecklistItem(item.id, id),
    onDelete: id    => deleteChecklistItem(item.id, id),
  }));

  return children;
}
