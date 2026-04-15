import { S, getPanelData, set, addItem, addCategory } from '../store.js';
import { h, customSelect, buildPriorityPicker } from '../dom.js';
import { normalizePriority, TODAY, computeChaseDate } from '../utils.js';

// ── Add item form ─────────────────────────────────────────────────────────────

export function buildAddForm() {
  const panel = getPanelData();
  const form = S.addItemForm;
  // Default to the currently viewed category, then first category
  if (!form.categoryId) {
    form.categoryId = S.activeCat || panel.categories[0]?.id || '';
  }

  const roundToNearest15 = hrs => Math.max(15, Math.round(parseFloat(hrs) * 60 / 15) * 15) || 60;
  const isWorkflow = form.type === 'workflow';

  const makeInput = (type, placeholder, val, key, extraClass) => {
    const isTime = key === 'timeNeeded';
    const displayVal = isTime ? (val ? val / 60 : 1) : (val || '');
    const attrs = { type, placeholder: placeholder || '', value: displayVal, class: `form-input${extraClass ? ' ' + extraClass : ''}` };
    if (isTime) { attrs.step = '0.25'; attrs.min = '0.25'; }
    const el = h('input', attrs);
    el.addEventListener('input', e => {
      S.addItemForm[key] = isTime ? roundToNearest15(e.target.value) : (type === 'number' ? (parseInt(e.target.value) || 0) : e.target.value);
    });
    if (type === 'date') el.style.colorScheme = S.theme;
    return el;
  };

  const makeSelect = (options, val, key) =>
    customSelect(options, val, v => { S.addItemForm[key] = v; });

  const doAdd = () => {
    if (!S.addItemForm.title.trim()) return;
    const formData = { ...S.addItemForm };
    if (formData.nature === 'waiting') formData.waitingSince = TODAY;
    addItem(formData);
  };

  const taskBtn = h('button', {
    class: `type-btn${!isWorkflow ? ' active' : ''}`,
    onClick: () => { S.addItemForm.type = 'task'; S.addItemForm.hasDueDate = false; set({}); },
  }, 'Task');
  const workflowBtn = h('button', {
    class: `type-btn${isWorkflow ? ' active' : ''}`,
    onClick: () => { S.addItemForm.type = 'workflow'; S.addItemForm.hasDueDate = false; set({}); },
  }, 'Workflow');

  const titleInput = makeInput('text',
    isWorkflow ? 'What is this workflow about?' : 'What needs to be done?',
    form.title, 'title', 'form-input-title',
  );
  titleInput.addEventListener('keydown', e => { if (e.key === 'Enter') doAdd(); });
  setTimeout(() => titleInput.focus(), 50);

  const notesArea = h('textarea', { class: 'form-input', rows: '2', placeholder: 'Optional notes...' }, form.notes || '');
  notesArea.addEventListener('input', e => { S.addItemForm.notes = e.target.value; });

  const catOptions = panel.categories.map(c => ({ v: c.id, l: c.name }));

  let fieldRows;

  if (isWorkflow) {
    // Due date checkbox + optional date input
    const ddCb = h('input', { type: 'checkbox', checked: !!form.hasDueDate, id: 'add-wf-dd' });
    const ddLabel = h('label', { class: 'wf-due-label', htmlFor: 'add-wf-dd' }, ddCb, 'This workflow has a due date');

    const ddInput = makeInput('date', '', form.dueDate, 'dueDate');
    const ddInputWrap = h('div', { class: 'form-field', style: { display: form.hasDueDate ? '' : 'none' } },
      h('div', { class: 'form-field-label' }, 'Due date'),
      ddInput,
    );

    ddCb.addEventListener('change', e => {
      S.addItemForm.hasDueDate = e.target.checked;
      if (!e.target.checked) S.addItemForm.dueDate = '';
      ddInputWrap.style.display = e.target.checked ? '' : 'none';
    });

    fieldRows = h('div', { class: 'form-fields' },
      h('div', { class: 'form-field' }, h('div', { class: 'form-field-label' }, 'Title'), titleInput),
      h('div', { class: 'form-grid' },
        h('div', { class: 'form-field' }, h('div', { class: 'form-field-label' }, 'Category'), makeSelect(catOptions, form.categoryId, 'categoryId')),
        h('div', { class: 'form-field add-wf-dd-field' }, ddLabel),
        ddInputWrap,
      ),
      h('div', { class: 'form-field' }, h('div', { class: 'form-field-label' }, 'Notes'), notesArea),
    );
  } else {
    const isWaiting = form.nature === 'waiting';

    const actionNatureBtn = h('button', {
      class: `wft-nature-pick${!isWaiting ? ' active' : ''}`,
      onClick: () => { S.addItemForm.nature = 'action'; set({}); },
    }, '▶ Action');
    const waitingNatureBtn = h('button', {
      class: `wft-nature-pick${isWaiting ? ' active' : ''}`,
      onClick: () => { S.addItemForm.nature = 'waiting'; set({}); },
    }, '⏳ Waiting');

    const recurOptions = [
      { v: '',        l: 'No repeat' },
      { v: 'daily',   l: 'Daily' },
      { v: 'weekly',  l: 'Weekly' },
      { v: 'monthly', l: 'Monthly' },
      { v: 'yearly',  l: 'Yearly' },
    ];

    // Pre-fill chase date when form first opens for a waiting task
    if (isWaiting && !form.chaseDate) {
      const auto = computeChaseDate(form.targetReturnDate, S.followUpDays);
      form.chaseDate = auto;
      S.addItemForm.chaseDate = auto;
    }
    const chaseDateEl  = makeInput('date', '', form.chaseDate, 'chaseDate');
    const targetRetEl  = makeInput('date', '', form.targetReturnDate, 'targetReturnDate');
    targetRetEl.addEventListener('change', e => {
      const auto = computeChaseDate(e.target.value, S.followUpDays);
      S.addItemForm.chaseDate = auto;
      chaseDateEl.value = auto;
    });

    const taskFieldGrid = isWaiting
      ? h('div', { class: 'form-grid' },
          h('div', { class: 'form-field' }, h('div', { class: 'form-field-label' }, 'Category'), makeSelect(catOptions, form.categoryId, 'categoryId')),
          h('div', { class: 'form-field' }, h('div', { class: 'form-field-label' }, 'Waiting on'), makeInput('text', 'Who or what?', form.waitingFrom, 'waitingFrom')),
          h('div', { class: 'form-field' }, h('div', { class: 'form-field-label' }, 'Target return date'), targetRetEl),
          h('div', { class: 'form-field' }, h('div', { class: 'form-field-label' }, 'Chase date'), chaseDateEl),
        )
      : h('div', { class: 'form-grid' },
          h('div', { class: 'form-field' }, h('div', { class: 'form-field-label' }, 'Category'), makeSelect(catOptions, form.categoryId, 'categoryId')),
          h('div', { class: 'form-field' }, h('div', { class: 'form-field-label' }, 'Due date'), makeInput('date', '', form.dueDate, 'dueDate')),
          h('div', { class: 'form-field' }, h('div', { class: 'form-field-label' }, 'Time (hrs)'), makeInput('number', '1', form.timeNeeded, 'timeNeeded')),
          h('div', { class: 'form-field' }, h('div', { class: 'form-field-label' }, 'Repeat'), makeSelect(recurOptions, form.recurrence || '', 'recurrence')),
        );

    const priorityField = !isWaiting
      ? h('div', { class: 'form-field' },
          h('div', { class: 'form-field-label' }, 'Default priority (auto-computed when due date + time are set)'),
          buildPriorityPicker(normalizePriority(form.priority), v => { S.addItemForm.priority = v; }),
        )
      : null;

    fieldRows = h('div', { class: 'form-fields' },
      h('div', { class: 'form-field' }, h('div', { class: 'form-field-label' }, 'Title'), titleInput),
      h('div', { class: 'wft-nature-picker form-nature-picker' }, actionNatureBtn, waitingNatureBtn),
      taskFieldGrid,
      priorityField,
      h('div', { class: 'form-field' }, h('div', { class: 'form-field-label' }, 'Notes'), notesArea),
    );
  }

  return h('div', { class: 'add-form' },
    h('div', { class: 'add-form-header' },
      h('div', { class: 'add-form-title' },
        h('div', { style: { width: '8px', height: '8px', borderRadius: '50%', background: '#378ADD', flexShrink: '0' } }),
        `New ${S.panel} item`,
      ),
      h('button', { class: 'add-form-close', onClick: () => set({ showAddItem: false }) }, '×'),
    ),
    h('div', { class: 'type-switcher' }, taskBtn, workflowBtn),
    fieldRows,
    h('div', { class: 'form-actions' },
      h('button', { class: 'btn-form-cancel', onClick: () => set({ showAddItem: false }) }, 'Cancel'),
      h('button', { class: 'btn-form-add', onClick: doAdd }, `Add ${form.type}`),
    ),
  );
}

// ── Add category form ─────────────────────────────────────────────────────────

export function buildAddCatForm() {
  let value = '';
  const input = h('input', { class: 'cat-input', placeholder: 'Category name...' });
  input.addEventListener('input', e => { value = e.target.value; });
  input.addEventListener('keydown', e => {
    if (e.key === 'Enter' && value.trim()) addCategory(value.trim());
    if (e.key === 'Escape') set({ showAddCat: false });
  });
  setTimeout(() => input.focus(), 50);

  return h('div', { class: 'add-cat-form' },
    input,
    h('div', { class: 'add-cat-form-actions' },
      h('button', { class: 'btn-cat-add', onClick: () => { if (value.trim()) addCategory(value.trim()); } }, 'Add'),
      h('button', { class: 'btn-cat-cancel', onClick: () => set({ showAddCat: false }) }, 'Cancel'),
    ),
  );
}
