import { getPanelData, addBudgetConsultant, updateBudgetConsultant, deleteBudgetConsultant, addBudgetInvoice, updateBudgetInvoice, deleteBudgetInvoice } from '../store.js';
import { h } from '../dom.js';

const num = v => parseFloat(v) || 0;
const fmt = v => {
  const n = num(v);
  return n === 0 ? '—' : '£' + n.toLocaleString('en-GB', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
};

function inp(val, placeholder, onChange, type = 'text') {
  const el = h('input', { class: 'bgt-inp', value: val ?? '', placeholder, type });
  el.addEventListener('change', e => onChange(e.target.value));
  if (type === 'number') el.style.textAlign = 'right';
  return el;
}

function selStr(val, options, onChange) {
  const el = h('select', { class: 'bgt-inp' },
    ...options.map(o => { const opt = h('option', { value: o }, o); if (o === val) opt.selected = true; return opt; }),
  );
  el.addEventListener('change', e => onChange(e.target.value));
  return el;
}

function selKV(val, options, onChange) {
  // options: [{ value, label }]
  const el = h('select', { class: 'bgt-inp' },
    ...options.map(o => { const opt = h('option', { value: o.value }, o.label); if (o.value === val) opt.selected = true; return opt; }),
  );
  el.addEventListener('change', e => onChange(e.target.value));
  return el;
}

function td(content, cls) { return h('td', cls ? { class: cls } : null, content); }
function calcTd(text, cls = '') { return h('td', { class: `bgt-r bgt-auto${cls ? ' ' + cls : ''}` }, text); }

function delBtn(onClick) {
  const btn = h('button', { class: 'bgt-del', title: 'Remove', tabindex: '-1' }, '×');
  btn.addEventListener('click', onClick);
  return btn;
}

// ── Totals per consultant derived from invoices ───────────────────────────────

function getConsultantTotals(consultantId, invoices) {
  const linked = invoices.filter(i => i.consultantId === consultantId);
  return {
    invoiced: linked.reduce((s, i) => s + num(i.net) + num(i.vat), 0),
    paid:     linked.filter(i => i.status === 'Paid').reduce((s, i) => s + num(i.net) + num(i.vat), 0),
    accounts: linked.filter(i => ['Pending', 'Approved', 'Paid'].includes(i.status)).reduce((s, i) => s + num(i.net) + num(i.vat), 0),
  };
}

// ── Pivot summary ─────────────────────────────────────────────────────────────

function buildPivot(consultants, invoices) {
  if (!consultants.length) return null;
  const byCategory = {};
  consultants.forEach(c => {
    const k = c.category || 'Other';
    if (!byCategory[k]) byCategory[k] = { quote: 0, budget: 0, paid: 0, invoiced: 0 };
    const totals = getConsultantTotals(c.id, invoices);
    const q = num(c.quote), b = q * (1 + num(c.contingencyPct) / 100);
    byCategory[k].quote    += q;
    byCategory[k].budget   += b;
    byCategory[k].paid     += totals.paid;
    byCategory[k].invoiced += totals.invoiced;
  });
  const tots = Object.values(byCategory).reduce(
    (t, v) => { t.quote += v.quote; t.budget += v.budget; t.paid += v.paid; t.invoiced += v.invoiced; return t; },
    { quote: 0, budget: 0, paid: 0, invoiced: 0 },
  );

  const dataRow = (label, v, cls) => h('tr', cls ? { class: cls } : null,
    h('td', null, label),
    h('td', { class: 'bgt-r' }, fmt(v.quote)),
    h('td', { class: 'bgt-r' }, fmt(v.budget)),
    h('td', { class: 'bgt-r bgt-auto' }, fmt(v.invoiced)),
    h('td', { class: 'bgt-r bgt-auto' }, fmt(v.paid)),
    h('td', { class: `bgt-r${v.budget - v.invoiced < 0 ? ' bgt-over' : ''}` }, fmt(v.budget - v.invoiced)),
  );

  return h('div', { class: 'bgt-block' },
    h('div', { class: 'bgt-block-title' }, 'Summary by Category'),
    h('div', { class: 'bgt-scroll' },
      h('table', { class: 'bgt-table bgt-pivot' },
        h('thead', null, h('tr', null,
          h('th', null, 'Category'),
          h('th', { class: 'bgt-r' }, 'Quote'),
          h('th', { class: 'bgt-r' }, 'Budget'),
          h('th', { class: 'bgt-r bgt-auto-hdr' }, 'Invoiced ↗'),
          h('th', { class: 'bgt-r bgt-auto-hdr' }, 'Paid ↗'),
          h('th', { class: 'bgt-r' }, 'Balance'),
        )),
        h('tbody', null, ...Object.entries(byCategory).map(([k, v]) => dataRow(k, v))),
        h('tfoot', null, dataRow('Total', tots, 'bgt-total')),
      ),
    ),
  );
}

// ── Consultants / Budget table ────────────────────────────────────────────────
// Accounts £, Paid £, Invoiced £ are auto-calculated from linked invoices.
// Columns: Party | Company | Contact | Appointed | Discipline | Category |
//          Sub-Category | Quote | Cont% | Budget | Accounts↗ | Paid↗ | Invoiced↗ |
//          Balance | Comments

const APPOINTED = ['—', 'Yes', 'No', 'Partial', 'Terminated'];

function doneCheckbox(checked, onChange) {
  const el = h('input', { type: 'checkbox', class: 'bgt-done-chk', title: 'Invoicing complete', tabindex: '-1' });
  el.checked = !!checked;
  el.addEventListener('change', e => onChange(e.target.checked));
  return el;
}

function buildConsultants(catId, consultants, invoices) {
  const rows = consultants.map(c => {
    const upd    = patch => updateBudgetConsultant(catId, c.id, patch);
    const budget = num(c.quote) * (1 + num(c.contingencyPct) / 100);
    const totals = getConsultantTotals(c.id, invoices);
    const balance = num(c.quote) - totals.invoiced;

    const hasActivity = num(c.quote) > 0 || totals.invoiced > 0;
    let balanceCls = balance < 0 ? 'bgt-over' : '';
    if (balance >= 0 && hasActivity) {
      balanceCls = c.invoicingDone ? 'bgt-bal-done' : 'bgt-bal-ongoing';
    }

    return h('tr', null,
      td(inp(c.party,          'Party',        v => upd({ party: v }))),
      td(inp(c.company,        'Company',      v => upd({ company: v }))),
      td(inp(c.contact,        'Contact',      v => upd({ contact: v }))),
      td(selStr(c.appointed || '—', APPOINTED, v => upd({ appointed: v }))),
      td(inp(c.discipline,     'Discipline',   v => upd({ discipline: v }))),
      td(inp(c.category,       'Category',     v => upd({ category: v }))),
      td(inp(c.subCategory,    'Sub-Category', v => upd({ subCategory: v }))),
      td(inp(c.quote,          '0', v => upd({ quote: v }),          'number'), 'bgt-r'),
      td(inp(c.contingencyPct, '0', v => upd({ contingencyPct: v }), 'number'), 'bgt-r'),
      calcTd(fmt(budget)),
      calcTd(fmt(totals.accounts)),
      calcTd(fmt(totals.paid)),
      calcTd(fmt(totals.invoiced)),
      calcTd(fmt(balance), balanceCls),
      td(doneCheckbox(c.invoicingDone, v => upd({ invoicingDone: v })), 'bgt-done-cell'),
      td(inp(c.comments, 'Notes', v => upd({ comments: v }))),
      td(delBtn(() => deleteBudgetConsultant(catId, c.id)), 'bgt-del-cell'),
    );
  });

  const addBtn = h('button', { class: 'bgt-add-btn' }, '+ Add consultant');
  addBtn.addEventListener('click', () =>
    addBudgetConsultant(catId, {
      party: '', company: '', contact: '', appointed: '—',
      discipline: '', category: '', subCategory: '',
      quote: '', contingencyPct: '10', invoicingDone: false, comments: '',
    }),
  );

  return h('div', { class: 'bgt-block' },
    h('div', { class: 'bgt-block-title' }, 'Consultants'),
    h('div', { class: 'bgt-scroll' },
      h('table', { class: 'bgt-table' },
        h('thead', null, h('tr', null,
          h('th', null, 'Party'),
          h('th', null, 'Company'),
          h('th', null, 'Contact'),
          h('th', null, 'Appointed'),
          h('th', null, 'Discipline'),
          h('th', null, 'Category'),
          h('th', null, 'Sub-Category'),
          h('th', { class: 'bgt-r' }, 'Quote £'),
          h('th', { class: 'bgt-r' }, 'Cont %'),
          h('th', { class: 'bgt-r bgt-auto-hdr' }, 'Budget £'),
          h('th', { class: 'bgt-r bgt-auto-hdr' }, 'Accounts £ ↗'),
          h('th', { class: 'bgt-r bgt-auto-hdr' }, 'Paid £ ↗'),
          h('th', { class: 'bgt-r bgt-auto-hdr' }, 'Invoiced £ ↗'),
          h('th', { class: 'bgt-r bgt-auto-hdr' }, 'Balance £'),
          h('th', { class: 'bgt-done-hdr', title: 'Tick when invoicing is complete — balance turns green' }, 'Done?'),
          h('th', null, 'Comments'),
          h('th', null, ''),
        )),
        h('tbody', null, ...rows),
      ),
    ),
    addBtn,
  );
}

// ── Invoice tracker ───────────────────────────────────────────────────────────
// Column order:
// Party | Company | Project | DM | SPV Name | Doc Type | Discipline | Category |
// Sub-Category | Invoice Date | Invoice # | Due Date | Status | Net £ | VAT £ |
// Total £ | Accounts Date | Paid Date | Comment

const STATUSES     = ['Pending', 'Approved', 'Paid', 'Disputed'];
const DOC_TYPES    = ['Invoice', 'Undertaking', 'Payable', 'Quote'];

// ── Bible field lookup ────────────────────────────────────────────────────────
function bibleField(catId, ...labels) {
  const cat = getPanelData().categories.find(c => c.id === catId);
  const sections = Array.isArray(cat?.bible?.sections) ? cat.bible.sections : [];
  for (const label of labels) {
    for (const sec of sections) {
      const row = sec.rows?.find(r => r.label?.toLowerCase() === label.toLowerCase());
      if (row?.value) return row.value;
    }
  }
  return '';
}

// ── Party datalist — suggests from budget consultants, autofills on match ─────
function partyCell(inv, consultants, catId) {
  const listId = `bgt-pl-${catId}`;
  const el = h('input', { class: 'bgt-inp', value: inv.party ?? '', placeholder: 'Party', list: listId });

  const applyValue = (val, saveAlways = false) => {
    const match = consultants.find(c => c.party && c.party === val);
    if (match) {
      // Exact match from datalist — autofill budget fields immediately
      updateBudgetInvoice(catId, inv.id, {
        party:        val,
        company:      match.company     || '',
        discipline:   match.discipline  || '',
        category:     match.category    || '',
        subCategory:  match.subCategory || '',
        consultantId: match.id,
      });
    } else if (saveAlways) {
      // User finished typing a free-text party name
      updateBudgetInvoice(catId, inv.id, { party: val, consultantId: '' });
    }
  };

  // 'input' fires immediately when datalist option is selected
  el.addEventListener('input',  e => applyValue(e.target.value, false));
  // 'change' fires on blur — saves free-text too
  el.addEventListener('change', e => applyValue(e.target.value, true));
  return el;
}

function ensurePartyDatalist(catId, consultants) {
  const id = `bgt-pl-${catId}`;
  let dl = document.getElementById(id);
  if (!dl) { dl = document.createElement('datalist'); dl.id = id; document.body.appendChild(dl); }
  dl.innerHTML = '';
  consultants.filter(c => c.party).forEach(c => {
    const opt = document.createElement('option'); opt.value = c.party; dl.appendChild(opt);
  });
}

// ── Row selection (module-level, survives re-renders, clears on category change) ─
let _selCatId = null;
const selectedInvoiceIds = new Set();

function clearSelectionIfNeeded(catId) {
  if (_selCatId !== catId) { selectedInvoiceIds.clear(); _selCatId = catId; }
}

function buildInvoiceTable(catId, invoices, consultants, onSelectionChange) {
  clearSelectionIfNeeded(catId);
  ensurePartyDatalist(catId, consultants);

  const allIds = invoices.map(i => i.id);

  // Header "select all" checkbox
  const headerChk = h('input', { type: 'checkbox', class: 'bgt-sel-chk', title: 'Select / deselect all', tabindex: '-1' });
  headerChk.indeterminate = selectedInvoiceIds.size > 0 && selectedInvoiceIds.size < allIds.length;
  headerChk.checked = allIds.length > 0 && allIds.every(id => selectedInvoiceIds.has(id));

  const syncHeader = () => {
    const n = allIds.filter(id => selectedInvoiceIds.has(id)).length;
    headerChk.checked = n === allIds.length && allIds.length > 0;
    headerChk.indeterminate = n > 0 && n < allIds.length;
  };

  headerChk.addEventListener('change', e => {
    if (e.target.checked) allIds.forEach(id => selectedInvoiceIds.add(id));
    else allIds.forEach(id => selectedInvoiceIds.delete(id));
    rowChkEls.forEach(c => { c.checked = e.target.checked; });
    onSelectionChange?.();
  });

  const rowChkEls = [];

  const rows = invoices.map(inv => {
    const upd   = patch => updateBudgetInvoice(catId, inv.id, patch);
    const total = num(inv.net) + num(inv.vat);

    const rowChk = h('input', { type: 'checkbox', class: 'bgt-sel-chk bgt-sel-row', title: 'Select row', tabindex: '-1' });
    rowChk.checked = selectedInvoiceIds.has(inv.id);
    rowChkEls.push(rowChk);

    rowChk.addEventListener('change', e => {
      if (e.target.checked) selectedInvoiceIds.add(inv.id);
      else selectedInvoiceIds.delete(inv.id);
      syncHeader();
      onSelectionChange?.();
    });

    const row = h('tr', null,
      td(rowChk, 'bgt-sel-cell'),
      td(partyCell(inv, consultants, catId)),
      td(inp(inv.company,       'Company',      v => upd({ company: v }))),
      td(inp(inv.project,       'Project',      v => upd({ project: v }))),
      td(inp(inv.dm,            'DM',           v => upd({ dm: v }))),
      td(inp(inv.spvName,       'SPV Name',     v => upd({ spvName: v }))),
      td(selStr(inv.documentType || 'Invoice', DOC_TYPES, v => upd({ documentType: v }))),
      td(inp(inv.discipline,    'Discipline',   v => upd({ discipline: v }))),
      td(inp(inv.category,      'Category',     v => upd({ category: v }))),
      td(inp(inv.subCategory,   'Sub-Category', v => upd({ subCategory: v }))),
      td(inp(inv.invoiceDate,   '',             v => upd({ invoiceDate: v }),  'date')),
      td(inp(inv.invoiceNumber, 'Inv #',        v => upd({ invoiceNumber: v }))),
      td(inp(inv.dueDate,       '',             v => upd({ dueDate: v }),      'date')),
      td(selStr(inv.status || 'Pending', STATUSES, v => upd({ status: v }))),
      td(inp(inv.net, '0', v => {
        const patch = { net: v };
        // Auto-fill VAT at 20% only if VAT is still blank
        if ((inv.vat === '' || inv.vat == null) && v) {
          patch.vat = String(Math.round(parseFloat(v) * 0.2) || '');
        }
        upd(patch);
      }, 'number'), 'bgt-r'),
      td(inp(inv.vat, '0', v => upd({ vat: v }), 'number'), 'bgt-r'),
      td(h('span', { class: 'bgt-calc' }, fmt(total)), 'bgt-r'),
      td(inp(inv.accountsDate,  '',             v => upd({ accountsDate: v }), 'date')),
      td(inp(inv.paidDate,      '',             v => upd({ paidDate: v }),     'date')),
      td(inp(inv.comment, 'Notes', v => upd({ comment: v }))),
      td(delBtn(() => deleteBudgetInvoice(catId, inv.id)), 'bgt-del-cell'),
    );

    if (selectedInvoiceIds.has(inv.id)) row.classList.add('bgt-sel-row-active');
    rowChk.addEventListener('change', () => {
      row.classList.toggle('bgt-sel-row-active', rowChk.checked);
    });

    return row;
  });

  const addBtn = h('button', { class: 'bgt-add-btn' }, '+ Add invoice');
  addBtn.addEventListener('click', () =>
    addBudgetInvoice(catId, {
      party: '', company: '',
      project:      bibleField(catId, 'project', 'project name'),
      dm:           bibleField(catId, 'dm', 'development manager', 'project manager'),
      spvName:      bibleField(catId, 'spv name', 'spv', 'spv entity'),
      documentType: 'Invoice',
      discipline: '', category: '', subCategory: '',
      invoiceDate: '', invoiceNumber: '', dueDate: '', status: 'Pending',
      net: '', vat: '', accountsDate: '', paidDate: '', comment: '',
      consultantId: '',
    }),
  );

  return h('div', { class: 'bgt-block' },
    h('div', { class: 'bgt-scroll' },
      h('table', { class: 'bgt-table' },
        h('thead', null, h('tr', null,
          h('th', { class: 'bgt-sel-hdr' }, headerChk),
          h('th', null, 'Party'),
          h('th', null, 'Company'),
          h('th', { class: 'bgt-auto-hdr', title: 'Pre-filled from Project Bible' }, 'Project ↗'),
          h('th', { class: 'bgt-auto-hdr', title: 'Pre-filled from Project Bible' }, 'DM ↗'),
          h('th', { class: 'bgt-auto-hdr', title: 'Pre-filled from Project Bible' }, 'SPV Name ↗'),
          h('th', null, 'Doc Type'),
          h('th', null, 'Discipline'),
          h('th', null, 'Category'),
          h('th', null, 'Sub-Category'),
          h('th', null, 'Invoice Date'),
          h('th', null, 'Invoice #'),
          h('th', null, 'Due Date'),
          h('th', null, 'Status'),
          h('th', { class: 'bgt-r' }, 'Net £'),
          h('th', { class: 'bgt-r' }, 'VAT £'),
          h('th', { class: 'bgt-r' }, 'Total £'),
          h('th', null, 'Accounts Date'),
          h('th', null, 'Paid Date'),
          h('th', null, 'Comment'),
          h('th', null, ''),
        )),
        h('tbody', null, ...rows),
      ),
    ),
    addBtn,
  );
}

// ── Exports ───────────────────────────────────────────────────────────────────

export function buildBudgetView(catId) {
  const cat    = getPanelData().categories.find(c => c.id === catId);
  const budget = cat?.budget || { consultants: [], invoices: [] };
  const frag   = document.createDocumentFragment();
  const pivot  = buildPivot(budget.consultants, budget.invoices);
  if (pivot) frag.appendChild(pivot);
  frag.appendChild(buildConsultants(catId, budget.consultants, budget.invoices));
  return frag;
}

// ── Copy-to-clipboard (TSV matching accountant import column order) ───────────

const INVOICE_HEADERS = [
  'Party', 'Company', 'Project', 'DM', 'SPV Name', 'Doc Type',
  'Discipline', 'Category', 'Sub-Category',
  'Invoice Date', 'Invoice #', 'Due Date', 'Status',
  'Net £', 'VAT £', 'Total £',
  'Accounts Date', 'Paid Date', 'Comment',
];

function invoiceToRow(inv) {
  const total = num(inv.net) + num(inv.vat);
  return [
    inv.party         || '',
    inv.company       || '',
    inv.project       || '',
    inv.dm            || '',
    inv.spvName       || '',
    inv.documentType  || '',
    inv.discipline    || '',
    inv.category      || '',
    inv.subCategory   || '',
    inv.invoiceDate   || '',
    inv.invoiceNumber || '',
    inv.dueDate       || '',
    inv.status        || '',
    inv.net           || '',
    inv.vat           || '',
    total ? total.toString() : '',
    inv.accountsDate  || '',
    inv.paidDate      || '',
    inv.comment       || '',
  ];
}

function buildCopyBtn(getInvoices) {
  const label = () => {
    const n = selectedInvoiceIds.size;
    return n > 0 ? `📋 Copy selected (${n})` : '📋 Copy all';
  };
  const btn = h('button', { class: 'bgt-copy-btn', title: 'Copy rows as tab-separated values — paste directly into Excel' }, label());

  btn.refresh = () => { btn.textContent = label(); };

  btn.addEventListener('click', () => {
    const invoices = getInvoices();
    const toCopy = selectedInvoiceIds.size > 0
      ? invoices.filter(inv => selectedInvoiceIds.has(inv.id))
      : invoices;
    const lines = [
      INVOICE_HEADERS.join('\t'),
      ...toCopy.map(inv => invoiceToRow(inv).join('\t')),
    ];
    navigator.clipboard.writeText(lines.join('\n')).then(() => {
      btn.textContent = '✓ Copied!';
      btn.classList.add('bgt-copy-ok');
      setTimeout(() => { btn.refresh(); btn.classList.remove('bgt-copy-ok'); }, 2000);
    });
  });
  return btn;
}

export function buildInvoicesView(catId) {
  const cat    = getPanelData().categories.find(c => c.id === catId);
  const budget = cat?.budget || { consultants: [], invoices: [] };
  const frag   = document.createDocumentFragment();

  const copyBtn = buildCopyBtn(() =>
    getPanelData().categories.find(c => c.id === catId)?.budget?.invoices || []
  );

  const titleRow = h('div', { class: 'bgt-title-row' },
    h('div', { class: 'bgt-block-title' }, 'Payment Tracker'),
    copyBtn,
  );
  frag.appendChild(titleRow);
  frag.appendChild(buildInvoiceTable(catId, budget.invoices, budget.consultants, () => copyBtn.refresh()));
  return frag;
}
