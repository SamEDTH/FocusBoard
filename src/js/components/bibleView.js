import {
  getPanelData,
  addBibleSection, updateBibleSection, updateBibleSectionTitle, deleteBibleSection,
  addBibleRow, updateBibleRow, deleteBibleRow,
  addBibleContact, updateBibleContact, deleteBibleContact,
  updateBibleGateway, updateBibleGatewayDate,
} from '../store.js';
import { h } from '../dom.js';

// Fields that feed into the Invoice Tracker (matched case-insensitively)
const INVOICE_LINKED = new Set(['project name', 'spv name', 'dm', 'development manager', 'project manager']);
const isLinked = label => INVOICE_LINKED.has(label?.trim().toLowerCase());

// ── Key-value row ─────────────────────────────────────────────────────────────

function buildRow(catId, sectionId, row) {
  const labelInp = h('input', { class: 'bv-label', value: row.label || '', placeholder: 'Field' });
  labelInp.addEventListener('change', e =>
    updateBibleRow(catId, sectionId, row.id, { label: e.target.value }),
  );

  const valueInp = h('input', { class: 'bv-value', value: row.value || '', placeholder: '—' });
  valueInp.addEventListener('change', e =>
    updateBibleRow(catId, sectionId, row.id, { value: e.target.value }),
  );

  const badge = isLinked(row.label)
    ? h('span', { class: 'bv-linked', title: 'Feeds into Invoice Tracker' }, '↗')
    : null;

  const del = h('button', { class: 'bv-row-del', tabindex: '-1', title: 'Remove row' }, '×');
  del.addEventListener('click', () => deleteBibleRow(catId, sectionId, row.id));

  return h('div', { class: 'bv-row' }, labelInp, valueInp, badge, del);
}

// ── Gateway status bar ────────────────────────────────────────────────────────

const GATEWAY_STAGES = ['Grid', 'HoTs', 'Option', 'Planning', 'RTB'];

function buildGatewayBar(catId, currentStage, gatewayDates) {
  const bar = h('div', { class: 'bv-gw-bar' });

  GATEWAY_STAGES.forEach((name, i) => {
    const n          = i + 1;
    const isDone     = currentStage > n;
    const isActive   = currentStage === n;
    const isPast     = isDone || isActive;   // confirmed = stage reached or passed
    const cls        = isDone ? 'bv-gw-stage bv-gw-done'
                     : isActive ? 'bv-gw-stage bv-gw-active'
                     : 'bv-gw-stage';

    const dot   = h('div', { class: 'bv-gw-dot' }, isDone ? '✓' : String(n));
    const label = h('div', { class: 'bv-gw-name' }, name);

    // Date input — confirmed (solid green) for past/active, anticipated (dashed amber) for future
    const dateVal = (gatewayDates || {})[name] || '';
    const dateInp = h('input', {
      class: `bv-gw-date ${isPast ? 'bv-gw-date-confirmed' : 'bv-gw-date-anticipated'}`,
      type:  'month',
      value: dateVal,
      title: `${isPast ? 'Confirmed' : 'Anticipated'} date for ${name} gateway`,
    });
    dateInp.addEventListener('click', e => e.stopPropagation());   // don't toggle gateway status
    dateInp.addEventListener('change', e => updateBibleGatewayDate(catId, name, e.target.value));

    const dateWrap = h('div', { class: 'bv-gw-date-wrap' },
      dateInp,
      h('span', { class: `bv-gw-date-lbl ${isPast ? 'bv-gw-date-lbl-confirmed' : ''}` },
        isPast ? 'Confirmed' : 'Anticipated',
      ),
    );

    const stage = h('div', { class: cls, title: `Gateway: ${name}` }, dot, label, dateWrap);
    stage.addEventListener('click', () =>
      updateBibleGateway(catId, isActive ? 0 : n),  // click active stage to deselect
    );

    bar.appendChild(stage);

    if (i < GATEWAY_STAGES.length - 1) {
      bar.appendChild(h('div', { class: `bv-gw-conn${isDone ? ' bv-gw-conn-done' : ''}` }));
    }
  });

  return h('div', { class: 'bv-gateway' },
    h('div', { class: 'bv-gw-label' }, 'Gateway Status'),
    bar,
  );
}

// ── Section node ──────────────────────────────────────────────────────────────

function buildNode(catId, section, isSummary) {
  const cols = isSummary ? 3 : (section.cols || 1);

  // Header: editable title + hover controls
  const titleInp = h('input', {
    class: 'bv-node-title',
    value: section.title || '',
    placeholder: 'Section title',
    tabindex: '-1',
  });
  titleInp.addEventListener('change', e =>
    updateBibleSectionTitle(catId, section.id, e.target.value.trim() || section.title),
  );

  const addRowBtn = h('button', { class: 'bv-ctrl', tabindex: '-1' }, '+ Row');
  addRowBtn.addEventListener('click', () => addBibleRow(catId, section.id));

  // Resize: cycles 1 → 2 → 3 → 1 (hidden for summary which is always full-width)
  const COL_ICONS = ['▣', '▣▣', '▣▣▣'];
  const resizeBtn = isSummary ? null : h('button', {
    class: 'bv-ctrl bv-resize',
    tabindex: '-1',
    title: 'Resize node',
  }, COL_ICONS[cols - 1] || '▣');
  if (resizeBtn) {
    resizeBtn.addEventListener('click', () =>
      updateBibleSection(catId, section.id, { cols: (cols % 3) + 1 }),
    );
  }

  const delSec = h('button', { class: 'bv-ctrl bv-ctrl-del', tabindex: '-1' }, '× Delete');
  delSec.addEventListener('click', () => deleteBibleSection(catId, section.id));

  const controls = h('div', { class: 'bv-node-controls' },
    addRowBtn,
    ...(resizeBtn ? [resizeBtn] : []),
    delSec,
  );

  const header = h('div', { class: 'bv-node-header' }, titleInp, controls);

  const body = h('div', { class: 'bv-node-body' },
    ...section.rows.map(r => buildRow(catId, section.id, r)),
  );

  const node = h('div', { class: `bv-node${isSummary ? ' bv-node-summary' : ''}` }, header, body);
  node.style.gridColumn = `span ${cols}`;

  if (isSummary) {
    const cat = getPanelData().categories.find(c => c.id === catId);
    node.appendChild(buildGatewayBar(catId, cat?.bible?.gatewayStage || 0, cat?.bible?.gatewayDates || {}));
  }

  return node;
}

// ── Key Contacts node ─────────────────────────────────────────────────────────

function buildContactsNode(catId, contacts) {
  const cell = (c, key, placeholder) => {
    const inp = h('input', { class: 'bv-contact-inp', value: c[key] || '', placeholder });
    inp.addEventListener('change', e =>
      updateBibleContact(catId, c.id, { [key]: e.target.value.trim() }),
    );
    return h('td', null, inp);
  };

  const rows = contacts.map(c => {
    const del = h('button', { class: 'bv-ctrl bv-ctrl-del', tabindex: '-1', title: 'Remove' }, '×');
    del.addEventListener('click', () => deleteBibleContact(catId, c.id));
    return h('tr', null,
      cell(c, 'role',    'Role'),
      cell(c, 'name',    'Name'),
      cell(c, 'company', 'Company'),
      cell(c, 'email',   'Email'),
      cell(c, 'phone',   'Phone'),
      h('td', { class: 'bv-contact-del-cell' }, del),
    );
  });

  const addBtn = h('button', { class: 'bv-ctrl', tabindex: '-1' }, '+ Contact');
  addBtn.addEventListener('click', () =>
    addBibleContact(catId, { role: '', name: '', company: '', email: '', phone: '' }),
  );

  const titleFixed = h('span', { class: 'bv-node-title bv-node-title-fixed' }, 'Key Contacts');
  const controls   = h('div', { class: 'bv-node-controls bv-node-controls-visible' }, addBtn);
  const header     = h('div', { class: 'bv-node-header' }, titleFixed, controls);

  const body = h('div', { class: 'bv-node-body bv-node-body-table' },
    h('table', { class: 'bv-contacts-table' },
      h('thead', null, h('tr', null,
        h('th', null, 'Role'), h('th', null, 'Name'), h('th', null, 'Company'),
        h('th', null, 'Email'), h('th', null, 'Phone'), h('th', null, ''),
      )),
      h('tbody', null, ...rows),
    ),
  );

  const node = h('div', { class: 'bv-node' }, header, body);
  node.style.gridColumn = 'span 3';
  return node;
}

// ── Export ────────────────────────────────────────────────────────────────────

export function buildBibleView(catId) {
  const cat      = getPanelData().categories.find(c => c.id === catId);
  const bible    = cat?.bible || {};
  const sections = Array.isArray(bible.sections) ? bible.sections : [];
  const contacts = Array.isArray(bible.contacts) ? bible.contacts : [];

  // Project Summary is always the first section with that title, or just the first
  const summaryIdx = sections.findIndex(s => s.title?.toLowerCase().includes('project summary'));
  const sIdx       = summaryIdx >= 0 ? summaryIdx : 0;

  const grid = h('div', { class: 'bv-grid' });
  sections.forEach((sec, i) => grid.appendChild(buildNode(catId, sec, i === sIdx)));
  grid.appendChild(buildContactsNode(catId, contacts));

  const addBtn = h('button', { class: 'bv-add-section-btn' }, '+ Add section');
  addBtn.addEventListener('click', () => addBibleSection(catId));

  const frag = document.createDocumentFragment();
  frag.appendChild(grid);
  frag.appendChild(addBtn);
  return frag;
}
