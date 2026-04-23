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
  const btn = h('button', { class: 'bgt-del', title: 'Remove' }, '×');
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

const APPOINTED = ['—', 'Yes', 'No', 'TBC'];

function buildConsultants(catId, consultants, invoices) {
  const rows = consultants.map(c => {
    const upd    = patch => updateBudgetConsultant(catId, c.id, patch);
    const budget = num(c.quote) * (1 + num(c.contingencyPct) / 100);
    const totals = getConsultantTotals(c.id, invoices);
    const balance = num(c.quote) - totals.invoiced;

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
      calcTd(fmt(balance), balance < 0 ? 'bgt-over' : ''),
      td(inp(c.comments, 'Notes', v => upd({ comments: v }))),
      td(delBtn(() => deleteBudgetConsultant(catId, c.id)), 'bgt-del-cell'),
    );
  });

  const addBtn = h('button', { class: 'bgt-add-btn' }, '+ Add consultant');
  addBtn.addEventListener('click', () =>
    addBudgetConsultant(catId, {
      party: '', company: '', contact: '', appointed: '—',
      discipline: '', category: '', subCategory: '',
      quote: '', contingencyPct: '', comments: '',
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
// Column order is fixed — matches accountant spreadsheet import format.
// "Linked To" is appended after Comment so import columns are unaffected.
//
// Columns: Party | Company | Discipline | Category | Sub-Category | SPV Name |
//          Invoice Date | Invoice # | Due Date | Status | Net £ | VAT £ |
//          Total £ | Accounts Date | Paid Date | Comment | Linked To

const STATUSES = ['Pending', 'Approved', 'Paid', 'Disputed'];

function buildInvoiceTable(catId, invoices, consultants) {
  const consultantOptions = [
    { value: '', label: '— unlinked —' },
    ...consultants.map(c => ({
      value: c.id,
      label: [c.party, c.company].filter(Boolean).join(' / ') || `Consultant ${c.id.slice(-4)}`,
    })),
  ];

  const rows = invoices.map(inv => {
    const upd   = patch => updateBudgetInvoice(catId, inv.id, patch);
    const total = num(inv.net) + num(inv.vat);
    return h('tr', null,
      td(inp(inv.party,         'Party',        v => upd({ party: v }))),
      td(inp(inv.company,       'Company',      v => upd({ company: v }))),
      td(inp(inv.discipline,    'Discipline',   v => upd({ discipline: v }))),
      td(inp(inv.category,      'Category',     v => upd({ category: v }))),
      td(inp(inv.subCategory,   'Sub-Category', v => upd({ subCategory: v }))),
      td(inp(inv.spvName,       'SPV Name',     v => upd({ spvName: v }))),
      td(inp(inv.invoiceDate,   '',             v => upd({ invoiceDate: v }),  'date')),
      td(inp(inv.invoiceNumber, 'Inv #',        v => upd({ invoiceNumber: v }))),
      td(inp(inv.dueDate,       '',             v => upd({ dueDate: v }),      'date')),
      td(selStr(inv.status || 'Pending', STATUSES, v => upd({ status: v }))),
      td(inp(inv.net, '0', v => upd({ net: v }), 'number'), 'bgt-r'),
      td(inp(inv.vat, '0', v => upd({ vat: v }), 'number'), 'bgt-r'),
      td(h('span', { class: 'bgt-calc' }, fmt(total)), 'bgt-r'),
      td(inp(inv.accountsDate,  '',             v => upd({ accountsDate: v }), 'date')),
      td(inp(inv.paidDate,      '',             v => upd({ paidDate: v }),     'date')),
      td(inp(inv.comment, 'Notes', v => upd({ comment: v }))),
      // Link to consultant — appended after data columns, does not affect import order
      td(selKV(inv.consultantId || '', consultantOptions, v => upd({ consultantId: v })), 'bgt-link-cell'),
      td(delBtn(() => deleteBudgetInvoice(catId, inv.id)), 'bgt-del-cell'),
    );
  });

  const addBtn = h('button', { class: 'bgt-add-btn' }, '+ Add invoice');
  addBtn.addEventListener('click', () =>
    addBudgetInvoice(catId, {
      party: '', company: '', discipline: '', category: '', subCategory: '', spvName: '',
      invoiceDate: '', invoiceNumber: '', dueDate: '', status: 'Pending',
      net: '', vat: '', accountsDate: '', paidDate: '', comment: '', consultantId: '',
    }),
  );

  return h('div', { class: 'bgt-block' },
    h('div', { class: 'bgt-scroll' },
      h('table', { class: 'bgt-table' },
        h('thead', null, h('tr', null,
          h('th', null, 'Party'),
          h('th', null, 'Company'),
          h('th', null, 'Discipline'),
          h('th', null, 'Category'),
          h('th', null, 'Sub-Category'),
          h('th', null, 'SPV Name'),
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
          h('th', { class: 'bgt-auto-hdr' }, 'Linked To ↗'),
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

export function buildInvoicesView(catId) {
  const cat    = getPanelData().categories.find(c => c.id === catId);
  const budget = cat?.budget || { consultants: [], invoices: [] };
  const frag   = document.createDocumentFragment();
  frag.appendChild(h('div', { class: 'bgt-block-title' }, 'Payment Tracker'));
  frag.appendChild(buildInvoiceTable(catId, budget.invoices, budget.consultants));
  return frag;
}
