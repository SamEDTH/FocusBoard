import { getPanelData, addBudgetConsultant, updateBudgetConsultant, deleteBudgetConsultant, clearBudgetConsultants, addBudgetInvoice, updateBudgetInvoice, deleteBudgetInvoice, deleteBudgetInvoices, clearBudgetInvoices, addConsultantPhase, updateConsultantPhase, deleteConsultantPhase, updateCashflowSettings } from '../store.js';
import { h } from '../dom.js';
import { showConfirm } from './confirm.js';

// ── Budget sample data ─────────────────────────────────────────────────────────

// One row per party+sub-category combination.
const BUDGET_SAMPLE = [
  { party: 'Avison Young', discipline: 'Planning', category: 'Planning', subCategory: 'Pre application',    quote: '3000',   timing: '3-5',   contingencyPct: '0', appointed: 'Yes', company: '', contact: '', invoicingDone: false, comments: '' },
  { party: 'Avison Young', discipline: 'Planning', category: 'Planning', subCategory: 'Application',        quote: '0',      timing: '14',    contingencyPct: '0', appointed: 'Yes', company: '', contact: '', invoicingDone: false, comments: '' },
  { party: 'Avison Young', discipline: 'Planning', category: 'Planning', subCategory: 'Planning reports',   quote: '190905', timing: '6-13',  contingencyPct: '0', appointed: 'Yes', company: '', contact: '', invoicingDone: false, comments: '' },
  { party: 'Avison Young', discipline: 'Planning', category: 'Planning', subCategory: 'Project Management', quote: '0',      timing: '6-13',  contingencyPct: '0', appointed: 'Yes', company: '', contact: '', invoicingDone: false, comments: '' },
  { party: 'Avison Young', discipline: 'Planning', category: 'Planning', subCategory: 'Post Application',   quote: '11493',  timing: '16-24', contingencyPct: '0', appointed: 'Yes', company: '', contact: '', invoicingDone: false, comments: '' },
  { party: 'GVA PR',       discipline: 'PR',       category: 'Planning', subCategory: 'PR',                 quote: '34434',  timing: '14',    contingencyPct: '0', appointed: 'Yes', company: '', contact: '', invoicingDone: false, comments: '' },
  { party: 'Nabarro LLP',  discipline: 'Legal',    category: 'Legal',    subCategory: 'Option & Lease',     quote: '102528', timing: '4-9',   contingencyPct: '0', appointed: 'Yes', company: '', contact: '', invoicingDone: false, comments: '' },
  { party: 'Nabarro LLP',  discipline: 'Legal',    category: 'Legal',    subCategory: 'Option Fee',         quote: '56537',  timing: '9,21',  contingencyPct: '0', appointed: 'Yes', company: '', contact: '', invoicingDone: false, comments: '' },
  { party: 'Nabarro LLP',  discipline: 'Legal',    category: 'Legal',    subCategory: 'Easement',           quote: '21238',  timing: '9-13',  contingencyPct: '0', appointed: 'Yes', company: '', contact: '', invoicingDone: false, comments: '' },
  { party: 'AECOM',        discipline: 'Grid',     category: 'Grid',     subCategory: 'Application (G)',      quote: '37362',  timing: '1',       contingencyPct: '0', appointed: 'Yes', company: '', contact: '', invoicingDone: false, comments: '' },
  { party: 'AECOM',        discipline: 'Grid',     category: 'Grid',     subCategory: 'Securities',           quote: '0',      timing: '4,10,16', contingencyPct: '0', appointed: 'Yes', company: '', contact: '', invoicingDone: false, comments: '' },
  { party: 'AECOM',        discipline: 'Grid',     category: 'Grid',     subCategory: 'Post Application (G)', quote: '42494',  timing: '15',      contingencyPct: '0', appointed: 'Yes', company: '', contact: '', invoicingDone: false, comments: '' },
];

function loadBudgetSample(catId) {
  const existing     = getPanelData().categories.find(c => c.id === catId)?.budget?.consultants || [];
  const existingKeys = new Set(existing.map(c => `${c.category}|${c.subCategory}|${c.party}`));
  BUDGET_SAMPLE.forEach(c => {
    if (!existingKeys.has(`${c.category}|${c.subCategory}|${c.party}`)) addBudgetConsultant(catId, c);
  });
  updateCashflowSettings(catId, { numMonths: 24 });
}

// Expand state survives re-renders (consultant ids that are expanded in budget)
const _expandedCons = new Set();

const num = v => parseFloat(v) || 0;

/** Highlight the hovered column across all rows via event delegation on a table element. */
function addColHighlight(table) {
  let lastCol = -1;
  table.addEventListener('mouseover', e => {
    const td = e.target.closest('td');
    if (!td) return;
    const col = td.cellIndex;
    if (col === lastCol) return;
    // Clear previous column
    if (lastCol >= 0) table.querySelectorAll(`td:nth-child(${lastCol + 1})`).forEach(c => c.classList.remove('bgt-col-hover'));
    // Highlight new column
    table.querySelectorAll(`td:nth-child(${col + 1})`).forEach(c => c.classList.add('bgt-col-hover'));
    lastCol = col;
  });
  table.addEventListener('mouseleave', () => {
    if (lastCol >= 0) table.querySelectorAll(`td:nth-child(${lastCol + 1})`).forEach(c => c.classList.remove('bgt-col-hover'));
    lastCol = -1;
  });
}
const fmt = v => {
  const n = num(v);
  return n === 0 ? '—' : '£' + n.toLocaleString('en-GB', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
};

function inp(val, placeholder, onChange, type = 'text') {
  const el = h('input', { class: 'bgt-inp', value: val ?? '', placeholder, type });
  el.addEventListener('change', e => onChange(e.target.value));
  el.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); el.blur(); } });
  if (type === 'number') {
    el.style.textAlign = 'right';
    el.type = 'text';           // use text to suppress spinners; keep numeric feel
    el.inputMode = 'decimal';
  }
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

// ── CSV helpers ───────────────────────────────────────────────────────────────

function parseCSV(text) {
  const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n').filter(l => l.trim());
  if (!lines.length) return { headers: [], rows: [] };

  const parseRow = line => {
    const fields = [];
    let cur = '', inQ = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQ && line[i + 1] === '"') { cur += '"'; i++; }
        else inQ = !inQ;
      } else if (ch === ',' && !inQ) {
        fields.push(cur.trim()); cur = '';
      } else {
        cur += ch;
      }
    }
    fields.push(cur.trim());
    return fields;
  };

  const rawHeaders = parseRow(lines[0]);
  const headers    = rawHeaders.map(h => h.toLowerCase().replace(/[£%]+/g, '').trim());
  const rows = lines.slice(1)
    .map(l => parseRow(l))
    .filter(vals => vals.some(v => v.trim()))
    .map(vals => {
      const obj = {};
      headers.forEach((h, i) => { obj[h] = vals[i] ?? ''; });
      return obj;
    });
  return { headers: rawHeaders, rows };
}

/**
 * Strip currency symbols, commas, spaces from a value and return a plain numeric string.
 * Returns '' if the result isn't a valid number.
 */
function cleanNumber(val) {
  if (val == null || val === '') return '';
  // Strip everything that isn't a digit, decimal point, or leading minus.
  // This handles £/$/€ symbols, commas, spaces, % — regardless of Unicode encoding.
  const s = String(val).replace(/[^\d.\-]/g, '');
  if (!s || s === '-' || s === '.') return '';
  // Guard against multiple decimal points (e.g. European "1.234.567,00" → just keep first dot)
  const dot = s.indexOf('.');
  const clean = dot < 0 ? s : s.slice(0, dot + 1) + s.slice(dot + 1).replace(/\./g, '');
  return /^-?\d+\.?\d*$/.test(clean) ? clean : '';
}

/** Contingency may arrive as a decimal fraction (0.1) or a percentage (10).
 *  If the cleaned number is > 0 and ≤ 1, treat it as a fraction and convert to %. */
function normaliseContingency(cleaned) {
  if (cleaned === '' || cleaned == null) return '10';
  const n = parseFloat(cleaned);
  if (isNaN(n)) return '10';
  if (n > 0 && n <= 1) return String(Math.round(n * 100));
  return cleaned;
}

const MONTHS = { jan:'01',feb:'02',mar:'03',apr:'04',may:'05',jun:'06',jul:'07',aug:'08',sep:'09',oct:'10',nov:'11',dec:'12' };

/**
 * Normalise a date value from any common format to YYYY-MM-DD.
 * Handles: YYYY-MM-DD, DD/MM/YYYY, DD-MM-YYYY, "20 Jun 2022", "20-Jun-22", JS Date strings.
 */
function cleanDate(val) {
  if (val == null || val === '') return '';
  const s = String(val).trim();
  // Already ISO
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  // DD/MM/YYYY or DD-MM-YYYY (UK)
  const dmy = s.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (dmy) return `${dmy[3]}-${dmy[2].padStart(2, '0')}-${dmy[1].padStart(2, '0')}`;
  // "20 Jun 2022" / "20-Jun-22" / "20 June 2022"
  const named = s.match(/^(\d{1,2})[\s\-]([A-Za-z]{3,9})[\s\-](\d{2,4})$/);
  if (named) {
    const m = MONTHS[named[2].substring(0, 3).toLowerCase()];
    if (m) {
      const yr = named[3].length === 2 ? '20' + named[3] : named[3];
      return `${yr}-${m}-${named[1].padStart(2, '0')}`;
    }
  }
  // JS Date as fallback
  const d = new Date(s);
  if (!isNaN(d.getTime())) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }
  return s; // return unchanged if unrecognised
}

/** Return the first element of `arr` matching any candidate (partial, case-insensitive). */
function matchHeader(arr, candidates) {
  for (const c of candidates) {
    const cLow = c.toLowerCase();
    const found = arr.find(h => { const hLow = h.toLowerCase(); return hLow === cLow || hLow.includes(cLow); });
    if (found !== undefined) return found;
  }
  return '';
}

/** Looks up a field in a CSV row object by one or more candidate key strings (partial, case-insensitive). */
function get(row, ...candidates) {
  const k = matchHeader(Object.keys(row), candidates);
  return (k !== '' && row[k] !== undefined) ? row[k] : '';
}

// ── Import preview modal ──────────────────────────────────────────────────────

/**
 * Shows a preview dialog before committing the import.
 * @param {object} opts
 * @param {string}   opts.title       — Dialog heading
 * @param {string}   opts.filename    — Original filename shown for reference
 * @param {string[]} opts.csvHeaders  — Raw column headers from the CSV
 * @param {object[]} opts.rows        — Already-mapped rows ready to import
 * @param {Array}    opts.columns     — [{ label, key }] columns to show in preview
 * @param {Function} opts.onConfirm   — Called with rows when user confirms
 */
function showImportPreview({ title, filename, csvHeaders, rows, columns, onConfirm }) {
  const overlay = h('div', { class: 'imp-overlay' });
  const close   = () => overlay.remove();
  overlay.addEventListener('click', e => { if (e.target === overlay) close(); });

  // ── Header ────────────────────────────────────────────────────────────────
  const hdr = h('div', { class: 'imp-hdr' },
    h('div', { class: 'imp-hdr-left' },
      h('div', { class: 'imp-title' }, title),
      h('div', { class: 'imp-filename' }, filename),
    ),
    h('button', { class: 'imp-x', onClick: close }, '×'),
  );

  // ── Column mapping ────────────────────────────────────────────────────────
  // Show which CSV headers mapped to which fields, and which were ignored
  const mappedKeys  = new Set(columns.map(c => c.key));
  const mappingEl   = h('div', { class: 'imp-mapping' });
  const mappingNote = h('div', { class: 'imp-mapping-label' }, 'Column mapping:');
  mappingEl.appendChild(mappingNote);
  const chips = h('div', { class: 'imp-chips' });

  // Which CSV headers successfully fed at least one mapped field?
  // We check by seeing if any mapped column has a non-empty value in the first row
  const firstRow = rows[0] || {};
  columns.forEach(col => {
    const hasData = rows.some(r => r[col.key] && String(r[col.key]).trim());
    const chip = h('span', { class: `imp-chip${hasData ? ' imp-chip-ok' : ' imp-chip-miss'}` },
      `${col.label} ${hasData ? '✓' : '—'}`,
    );
    chips.appendChild(chip);
  });
  mappingEl.appendChild(chips);

  // Multi-sheet note
  const sheetNote = h('div', { class: 'imp-sheet-note' },
    'CSV files are single-sheet. If your data spans multiple sheets, export each sheet separately and import one at a time.',
  );

  // ── Preview table ─────────────────────────────────────────────────────────
  const PREVIEW_LIMIT = 100;
  const preview  = rows.slice(0, PREVIEW_LIMIT);
  const hasMore  = rows.length > PREVIEW_LIMIT;

  const tableWrap = h('div', { class: 'imp-scroll' });

  if (rows.length === 0) {
    tableWrap.appendChild(h('div', { class: 'imp-empty' },
      'No valid rows found. Make sure your CSV has a header row and at least one data row with a Party or Invoice # value.',
    ));
  } else {
    const thead = h('thead', null, h('tr', null,
      ...columns.map(col => h('th', null, col.label)),
    ));
    const tbody = h('tbody', null,
      ...preview.map(row => h('tr', null,
        ...columns.map(col => {
          const val = String(row[col.key] ?? '');
          const cell = h('td', null, val);
          if (!val) cell.classList.add('imp-td-empty');
          return cell;
        }),
      )),
    );
    tableWrap.appendChild(h('table', { class: 'imp-table' }, thead, tbody));
    if (hasMore) {
      tableWrap.appendChild(h('div', { class: 'imp-more' },
        `Showing first ${PREVIEW_LIMIT} of ${rows.length} rows — all ${rows.length} will be imported.`,
      ));
    }
  }

  // ── Summary + footer ──────────────────────────────────────────────────────
  const summary = h('div', { class: 'imp-summary' },
    rows.length > 0
      ? h('span', null, `${rows.length} row${rows.length !== 1 ? 's' : ''} ready to import`)
      : h('span', { class: 'imp-warn' }, 'Nothing to import'),
  );

  const cancelBtn  = h('button', { class: 'imp-btn-cancel',  onClick: close }, 'Cancel');
  const confirmBtn = h('button', {
    class:   'imp-btn-confirm',
    disabled: rows.length === 0,
    onClick: () => { onConfirm(rows); close(); },
  }, `Import ${rows.length} row${rows.length !== 1 ? 's' : ''}`);

  const footer = h('div', { class: 'imp-footer' }, summary, h('div', { class: 'imp-footer-btns' }, cancelBtn, confirmBtn));

  // ── Assemble ──────────────────────────────────────────────────────────────
  const dialog = h('div', { class: 'imp-dialog' });
  dialog.appendChild(hdr);
  dialog.appendChild(mappingEl);
  dialog.appendChild(sheetNote);
  dialog.appendChild(tableWrap);
  dialog.appendChild(footer);

  overlay.appendChild(dialog);
  document.body.appendChild(overlay);
}

// ── CSV upload button ─────────────────────────────────────────────────────────

/**
 * @param {string}   label    — Human label for the type of data ("consultants" / "invoices")
 * @param {Function} prepare  — (rawRows, filename) => { rows, columns }
 *                              Maps raw CSV rows to import-ready objects and returns preview column defs.
 * @param {Function} doImport — (rows) => void  — Runs the actual store inserts.
 */
function buildCSVUploadBtn(label, prepare, doImport) {
  const btn = h('button', { class: 'bgt-csv-btn', title: `Import ${label} from CSV` }, '⬆ CSV');
  btn.addEventListener('click', () => {
    const fileInput = document.createElement('input');
    fileInput.type  = 'file';
    fileInput.accept = '.csv,text/csv,text/plain';
    fileInput.addEventListener('change', () => {
      const file = fileInput.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = e => {
        try {
          const { headers, rows: rawRows } = parseCSV(e.target.result || '');
          const { rows, columns } = prepare(rawRows, file.name);
          showImportPreview({
            title:      `Import ${label}`,
            filename:   file.name,
            csvHeaders: headers,
            rows,
            columns,
            onConfirm: importedRows => {
              doImport(importedRows);
              btn.textContent = `✓ ${importedRows.length} imported`;
              btn.classList.add('bgt-copy-ok');
              setTimeout(() => { btn.textContent = '⬆ CSV'; btn.classList.remove('bgt-copy-ok'); }, 3000);
            },
          });
        } catch (err) {
          console.error('[CSV import]', err);
          btn.textContent = '✗ Parse error';
          btn.classList.add('bgt-csv-err');
          setTimeout(() => { btn.textContent = '⬆ CSV'; btn.classList.remove('bgt-csv-err'); }, 3000);
        }
      };
      reader.readAsText(file);
    });
    fileInput.click();
  });
  return btn;
}

// ── Excel (.xlsx) multi-sheet import ─────────────────────────────────────────

/** Lazy-loads SheetJS from CDN — only downloaded when the user first imports an xlsx. */
async function loadSheetJS() {
  if (window.XLSX) return window.XLSX;
  return new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src     = 'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js';
    s.onload  = () => resolve(window.XLSX);
    s.onerror = () => reject(new Error('Could not load Excel parser — check your internet connection.'));
    document.head.appendChild(s);
  });
}

/** Scan up to the first 25 rows for a header row containing all required keywords. */
function detectHeaderRow(allRows, keywords) {
  for (let i = 0; i < Math.min(allRows.length, 25); i++) {
    const lower = allRows[i].map(c => String(c ?? '').toLowerCase().trim());
    if (keywords.every(kw => lower.some(c => c.includes(kw)))) return i;
  }
  return -1;
}

/**
 * Reads an .xlsx file and returns one entry per sheet:
 * { name, type: 'consultants'|'invoices'|null, objects: [row objects] }
 * Values only — formulas are read from their cached results, never re-evaluated.
 */
async function parseXLSXFile(file) {
  const XLSX = await loadSheetJS();
  const buf  = await file.arrayBuffer();
  // cellFormula: false → don't store formula strings; we only want cached 'v' values
  const wb   = XLSX.read(buf, { type: 'array', cellFormula: false, cellDates: true });

  const CONS_KWS = ['party', 'quote', 'contingency'];
  const INV_KWS  = ['party', 'invoice', 'status'];

  return wb.SheetNames.map(sheetName => {
    const ws = wb.Sheets[sheetName];
    if (!ws['!ref']) return { name: sheetName, type: null, objects: [] };

    // Use sheet_to_json for performance (cell-by-cell loops freeze the browser on large sheets).
    // raw: true → JS numbers for numeric cells (no £/comma formatting), Date objects for date cells.
    // defval: '' → empty string for blank cells.
    const allRows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '', raw: true })
      .map(row => row.map(v => {
        if (v instanceof Date) {
          return `${v.getFullYear()}-${String(v.getMonth() + 1).padStart(2, '0')}-${String(v.getDate()).padStart(2, '0')}`;
        }
        return String(v ?? '').trim();
      }));

    let type   = null;
    let hdrIdx = -1;
    if ((hdrIdx = detectHeaderRow(allRows, CONS_KWS)) >= 0)     type = 'consultants';
    else if ((hdrIdx = detectHeaderRow(allRows, INV_KWS)) >= 0) type = 'invoices';

    let objects = [];
    let hdrs    = [];
    if (hdrIdx >= 0) {
      hdrs = allRows[hdrIdx].map(c => c.toLowerCase().replace(/[£%?/]+/g, '').trim());

      // Columns whose values must be plain numbers (strip £, commas, etc.)
      const NUM_KEYS  = new Set(['quote', 'fee', 'net', 'vat', 'amount', 'contingency', 'cont', 'total', 'balance', 'paid', 'invoiced']);
      // Columns whose values must be YYYY-MM-DD dates
      const DATE_KEYS = new Set(['date', 'due', 'accounts', 'paid date', 'accounts date', 'invoice date']);

      // Decide clean function for each column up-front, once
      const cleaners = hdrs.map(h => {
        if (NUM_KEYS.has(h) || [...NUM_KEYS].some(k => h.includes(k))) return cleanNumber;
        if (DATE_KEYS.has(h) || [...DATE_KEYS].some(k => h.includes(k))) return cleanDate;
        return v => v;
      });

      objects = allRows.slice(hdrIdx + 1)
        .filter(r => r.some(c => c !== ''))
        .map(r => {
          const obj = {};
          hdrs.forEach((h, i) => { obj[h] = cleaners[i](r[i] ?? ''); });
          return obj;
        });
    }
    return { name: sheetName, type, objects, sourceHeaders: hdrs };
  });
}

// ── Column mapping helpers ─────────────────────────────────────────────────────
// `required` is UI-only (bold label) — the apply functions filter on r.party directly.

const FIELD_DEFS = {
  consultants: [
    { key: 'party',          label: 'Party',        required: true,  candidates: ['party', 'firm', 'name'] },
    { key: 'company',        label: 'Company',       required: false, candidates: ['company'] },
    { key: 'contact',        label: 'Contact',       required: false, candidates: ['contact', 'email', 'e-mail', 'email address', 'person'] },
    { key: 'appointed',      label: 'Appointed',     required: false, candidates: ['appointed'] },
    { key: 'discipline',     label: 'Discipline',    required: false, candidates: ['discipline'] },
    { key: 'category',       label: 'Category',      required: false, candidates: ['category', 'cat'] },
    { key: 'subCategory',    label: 'Sub-Category',  required: false, candidates: ['sub category', 'subcategory', 'sub-category'] },
    { key: 'quote',          label: 'Quote £',       required: false, candidates: ['quote', 'fee'] },
    { key: 'contingencyPct', label: 'Cont %',        required: false, candidates: ['contingency', 'cont'] },
    { key: 'comments',       label: 'Comments',      required: false, candidates: ['comments', 'notes', 'comment'] },
  ],
  invoices: [
    { key: 'party',          label: 'Party',         required: true,  candidates: ['party', 'firm', 'supplier', 'vendor'] },
    { key: 'invoiceNumber',  label: 'Invoice #',     required: false, candidates: ['invoice #', 'invoice number', 'inv #', 'inv no'] },
    { key: 'invoiceDate',    label: 'Invoice Date',  required: false, candidates: ['invoice date', 'date'] },
    { key: 'documentType',   label: 'Doc Type',      required: false, candidates: ['document type', 'doc type', 'type', 'document'] },
    { key: 'net',            label: 'Net £',         required: false, candidates: ['net value', 'net', 'amount', 'ex vat', 'excl vat'] },
    { key: 'vat',            label: 'VAT £',         required: false, candidates: ['vat'] },
    { key: 'status',         label: 'Status',        required: false, candidates: ['status'] },
    { key: 'category',       label: 'Category',      required: false, candidates: ['category', 'cat'] },
    { key: 'dueDate',        label: 'Due Date',      required: false, candidates: ['due date', 'due'] },
    { key: 'accountsDate',   label: 'Accounts Date', required: false, candidates: ['accounts date', 'accounts'] },
    { key: 'paidDate',       label: 'Paid Date',     required: false, candidates: ['paid date', 'paid'] },
    { key: 'comment',        label: 'Comment',       required: false, candidates: ['comment', 'comments', 'notes'] },
  ],
};

function applyConsultantMapping(mapping, rawRows) {
  const pick = (row, key) => mapping[key] ? String(row[mapping[key]] ?? '').trim() : '';
  return rawRows.map(row => ({
    party:          pick(row, 'party'),
    company:        pick(row, 'company'),
    contact:        pick(row, 'contact'),
    appointed:      pick(row, 'appointed') || '—',
    discipline:     pick(row, 'discipline'),
    category:       pick(row, 'category'),
    subCategory:    pick(row, 'subCategory'),
    quote:          cleanNumber(pick(row, 'quote')),
    contingencyPct: normaliseContingency(cleanNumber(pick(row, 'contingencyPct'))),
    invoicingDone:  false,
    comments:       pick(row, 'comments'),
  })).filter(r => r.party);
}

function applyInvoiceMapping(mapping, rawRows, catId) {
  const cons = getPanelData().categories.find(c => c.id === catId)?.budget?.consultants || [];
  const pick = (row, key) => mapping[key] ? String(row[mapping[key]] ?? '').trim() : '';
  return rawRows.map(row => {
    const party = pick(row, 'party');
    const match = cons.find(c => c.party && c.party.toLowerCase() === party.toLowerCase());
    return {
      party,
      company:       match?.company    || pick(row, 'company'),
      project:       pick(row, 'project') || bibleField(catId, 'project', 'project name'),
      dm:            pick(row, 'dm')    || bibleField(catId, 'dm', 'development manager'),
      spvName:       pick(row, 'spvName') || bibleField(catId, 'spv name', 'spv'),
      documentType:  pick(row, 'documentType') || 'Invoice',
      discipline:    match?.discipline || pick(row, 'discipline'),
      category:      match?.category   || pick(row, 'category'),
      subCategory:   match?.subCategory || pick(row, 'subCategory'),
      invoiceDate:   cleanDate(pick(row, 'invoiceDate')),
      invoiceNumber: pick(row, 'invoiceNumber'),
      dueDate:       cleanDate(pick(row, 'dueDate')),
      status:        pick(row, 'status') || 'Pending',
      net:           cleanNumber(pick(row, 'net')),
      vat:           cleanNumber(pick(row, 'vat')),
      accountsDate:  cleanDate(pick(row, 'accountsDate')),
      paidDate:      cleanDate(pick(row, 'paidDate')),
      comment:       pick(row, 'comment'),
      consultantId:  match?.id || '',
    };
  }).filter(r => r.party || r.invoiceNumber);
}

const XLSX_COLS = {
  consultants: [
    { label: 'Party',      key: 'party' },
    { label: 'Company',    key: 'company' },
    { label: 'Contact',    key: 'contact' },
    { label: 'Discipline', key: 'discipline' },
    { label: 'Category',   key: 'category' },
    { label: 'Sub-Cat',    key: 'subCategory' },
    { label: 'Quote £',    key: 'quote' },
    { label: 'Cont %',     key: 'contingencyPct' },
    { label: 'Appointed',  key: 'appointed' },
    { label: 'Comments',   key: 'comments' },
  ],
  invoices: [
    { label: 'Party',        key: 'party' },
    { label: 'Invoice #',    key: 'invoiceNumber' },
    { label: 'Invoice Date', key: 'invoiceDate' },
    { label: 'Doc Type',     key: 'documentType' },
    { label: 'Net £',        key: 'net' },
    { label: 'VAT £',        key: 'vat' },
    { label: 'Status',       key: 'status' },
    { label: 'Category',     key: 'category' },
    { label: 'Due Date',     key: 'dueDate' },
  ],
};

function showXLSXPreview(catId, sheets, filename) {
  const overlay = h('div', { class: 'imp-overlay' });
  const close   = () => overlay.remove();
  overlay.addEventListener('click', e => { if (e.target === overlay) close(); });

  // Include/exclude state per sheet (default: include all detected)
  const include = new Map(sheets.map(s => [s.name, s.type !== null]));

  const TYPE_LABEL = { consultants: 'Budget / Consultants', invoices: 'Invoices / Payment Tracker' };
  const TYPE_CLS   = { consultants: 'imp-type-cons', invoices: 'imp-type-inv' };

  let activeSheet = sheets.find(s => s.type)?.name;

  // Per-sheet column mappings: sheetName → { fieldKey: sourceHeader }
  const sheetMappings = new Map();
  sheets.forEach(s => {
    if (s.type && s.sourceHeaders) {
      sheetMappings.set(s.name, Object.fromEntries(
        FIELD_DEFS[s.type].map(f => [f.key, matchHeader(s.sourceHeaders, f.candidates)])
      ));
    }
  });

  // Count cache — invalidated per-sheet when its mapping changes
  const countCache = new Map();
  const getCachedCount = s => {
    if (!s.type) return 0;
    if (!countCache.has(s.name)) {
      const mapping = sheetMappings.get(s.name) || {};
      countCache.set(s.name, s.type === 'consultants'
        ? applyConsultantMapping(mapping, s.objects).length
        : applyInvoiceMapping(mapping, s.objects, catId).length);
    }
    return countCache.get(s.name);
  };

  const sheetListEl = h('tbody');
  const mappingEl   = h('div', { class: 'imp-map-section' });
  const previewEl   = h('div', { class: 'imp-scroll' });
  const summaryEl   = h('span', { class: 'imp-summary' });
  const importBtn   = h('button', { class: 'imp-btn-confirm' }, 'Import');

  const renderPreviewAndFooter = (activeMapped) => {
    previewEl.innerHTML = '';
    const sheet = sheets.find(s => s.name === activeSheet);
    // activeMapped is passed in from renderAll to avoid re-computing for the active sheet
    const mapped = activeMapped ?? (sheet?.type ? (() => {
      const mapping = sheetMappings.get(sheet.name) || {};
      return sheet.type === 'consultants'
        ? applyConsultantMapping(mapping, sheet.objects)
        : applyInvoiceMapping(mapping, sheet.objects, catId);
    })() : []);

    if (!sheet?.type) {
      previewEl.appendChild(h('div', { class: 'imp-empty' }, 'Click a recognised sheet above to preview its data.'));
    } else {
      const cols    = XLSX_COLS[sheet.type];
      const preview = mapped.slice(0, 100);
      if (!preview.length) {
        previewEl.appendChild(h('div', { class: 'imp-empty' }, 'No valid rows found. Check the Party column mapping above.'));
      } else {
        previewEl.appendChild(h('div', { class: 'imp-preview-label' },
          `${sheet.name}  ·  ${TYPE_LABEL[sheet.type]}  ·  ${mapped.length} rows`,
        ));
        previewEl.appendChild(h('table', { class: 'imp-table' },
          h('thead', null, h('tr', null, ...cols.map(c => h('th', null, c.label)))),
          h('tbody', null, ...preview.map(row => h('tr', null, ...cols.map(c => {
            const val  = String(row[c.key] ?? '');
            const cell = h('td', null, val);
            if (!val) cell.classList.add('imp-td-empty');
            return cell;
          })))),
        ));
        if (mapped.length > 100) previewEl.appendChild(h('div', { class: 'imp-more' }, `Showing first 100 of ${mapped.length} rows.`));
      }
    }
    // Footer — use activeMapped.length for active sheet, cached count for others
    const included = sheets.filter(s => s.type && include.get(s.name));
    const countFor = s => s.name === activeSheet ? mapped.length : getCachedCount(s);
    const nCons = included.filter(s => s.type === 'consultants').reduce((n, s) => n + countFor(s), 0);
    const nInv  = included.filter(s => s.type === 'invoices').reduce((n, s) => n + countFor(s), 0);
    const parts = [];
    if (nCons) parts.push(`${nCons} consultant${nCons !== 1 ? 's' : ''}`);
    if (nInv)  parts.push(`${nInv} invoice${nInv !== 1 ? 's' : ''}`);
    const total = nCons + nInv;
    summaryEl.textContent = total > 0 ? `Ready to import: ${parts.join(' + ')}` : 'No sheets selected';
    importBtn.disabled    = total === 0;
    importBtn.textContent = total > 0 ? `Import ${total} rows` : 'Import';
  };

  const renderAll = () => {
    // Build the active sheet's mapped rows once — passed to renderPreviewAndFooter and used for sheet-list count
    const sheet = sheets.find(s => s.name === activeSheet);
    let activeMapped = [];
    if (sheet?.type) {
      const mapping = sheetMappings.get(sheet.name) || {};
      activeMapped = sheet.type === 'consultants'
        ? applyConsultantMapping(mapping, sheet.objects)
        : applyInvoiceMapping(mapping, sheet.objects, catId);
    }

    sheetListEl.innerHTML = '';
    sheets.forEach(s => {
      const isOn  = include.get(s.name);
      const count = s.type ? (s.name === activeSheet ? activeMapped.length : getCachedCount(s)) : null;
      const toggle = h('button', { class: `imp-toggle${isOn ? ' imp-toggle-on' : ''}`, disabled: !s.type }, isOn ? 'Include' : 'Skip');
      if (s.type) {
        toggle.addEventListener('click', () => {
          include.set(s.name, !isOn);
          if (!isOn) activeSheet = s.name;
          renderAll();
        });
      }
      const nameEl = h('td', { class: `imp-sheet-name${s.name === activeSheet ? ' imp-sheet-active-name' : ''}` }, s.name);
      if (s.type) nameEl.addEventListener('click', () => { activeSheet = s.name; renderAll(); });
      sheetListEl.appendChild(h('tr', { class: s.name === activeSheet ? 'imp-sheet-row-active' : 'imp-sheet-row' },
        nameEl,
        h('td', null, s.type ? h('span', { class: `imp-type-badge ${TYPE_CLS[s.type]}` }, TYPE_LABEL[s.type]) : h('span', { class: 'imp-type-badge imp-type-none' }, 'Not recognised')),
        h('td', { class: 'imp-sheet-count' }, count != null ? `${count} rows` : '—'),
        h('td', { class: 'imp-sheet-toggle-cell' }, toggle),
      ));
    });

    // Column mapping UI for active sheet
    mappingEl.innerHTML = '';
    if (sheet?.type && sheet.sourceHeaders?.length) {
      const mapping = sheetMappings.get(sheet.name);
      mappingEl.appendChild(h('div', { class: 'imp-map-header' }, `Column mapping — ${sheet.name}`));
      const grid = h('div', { class: 'imp-map-grid' });
      FIELD_DEFS[sheet.type].forEach(({ key, label, required }) => {
        const sel = h('select', { class: 'imp-map-sel' });
        sel.appendChild(h('option', { value: '' }, '— none —'));
        sheet.sourceHeaders.forEach(src => {
          const opt = h('option', { value: src }, src);
          if (src === mapping[key]) opt.selected = true;
          sel.appendChild(opt);
        });
        sel.addEventListener('change', () => {
          mapping[key] = sel.value;
          countCache.delete(sheet.name); // invalidate cached count for this sheet
          renderPreviewAndFooter();
        });
        grid.appendChild(h('div', { class: 'imp-map-row' },
          h('span', { class: `imp-map-label${required ? ' imp-map-req' : ''}` }, label),
          sel,
        ));
      });
      mappingEl.appendChild(grid);
    }

    renderPreviewAndFooter(activeMapped);
  };

  // Import — consultants FIRST so invoices can link to them
  importBtn.addEventListener('click', () => {
    const conSheets = sheets.filter(s => s.type === 'consultants' && include.get(s.name));
    const invSheets = sheets.filter(s => s.type === 'invoices'    && include.get(s.name));
    conSheets.forEach(s => applyConsultantMapping(sheetMappings.get(s.name) || {}, s.objects).forEach(r => upsertConsultant(catId, r)));
    invSheets.forEach(s => applyInvoiceMapping(sheetMappings.get(s.name) || {}, s.objects, catId).forEach(r => upsertInvoice(catId, r)));
    close();
  });

  const dialog = h('div', { class: 'imp-dialog' });
  dialog.appendChild(h('div', { class: 'imp-hdr' },
    h('div', { class: 'imp-hdr-left' },
      h('div', { class: 'imp-title' }, 'Import from Excel'),
      h('div', { class: 'imp-filename' }, filename),
    ),
    h('button', { class: 'imp-x', onClick: close }, '×'),
  ));
  dialog.appendChild(h('div', { class: 'imp-sheet-note' },
    'Consultants are imported before invoices so budget links resolve correctly. Use the column mapping below to fix any fields that are blank in the preview.',
  ));
  dialog.appendChild(h('div', { class: 'imp-sheetlist-wrap' },
    h('table', { class: 'imp-sheetlist' },
      h('thead', null, h('tr', null,
        h('th', null, 'Sheet'), h('th', null, 'Detected as'), h('th', null, 'Rows'), h('th', null, ''),
      )),
      sheetListEl,
    ),
  ));
  dialog.appendChild(mappingEl);
  dialog.appendChild(previewEl);
  dialog.appendChild(h('div', { class: 'imp-footer' },
    summaryEl,
    h('div', { class: 'imp-footer-btns' },
      h('button', { class: 'imp-btn-cancel', onClick: close }, 'Cancel'),
      importBtn,
    ),
  ));

  renderAll();
  overlay.appendChild(dialog);
  document.body.appendChild(overlay);
}

/** "Import from Excel" button — handles multi-sheet .xlsx, shows the preview modal. */
function buildExcelImportBtn(catId) {
  const btn = h('button', { class: 'bgt-xlsx-btn', title: 'Import from Excel (.xlsx) — reads both budget and invoice sheets at once' }, '📥 Excel');
  btn.addEventListener('click', () => {
    const fi    = document.createElement('input');
    fi.type     = 'file';
    fi.accept   = '.xlsx,.xls';
    fi.addEventListener('change', async () => {
      const file = fi.files?.[0];
      if (!file) return;
      const orig = btn.textContent;
      btn.textContent = 'Reading…';
      btn.disabled    = true;
      try {
        const sheets = await parseXLSXFile(file);
        showXLSXPreview(catId, sheets, file.name);
      } catch (err) {
        alert(`Could not read Excel file:\n${err.message}`);
      } finally {
        btn.textContent = orig;
        btn.disabled    = false;
      }
    });
    fi.click();
  });
  return btn;
}

// ── Upsert helpers (match existing rows before adding) ────────────────────────

/**
 * Update an existing consultant (matched by party name) or add a new one.
 * Returns 'updated' | 'added'.
 */
function upsertConsultant(catId, data) {
  const existing = getPanelData().categories.find(c => c.id === catId)?.budget?.consultants || [];
  const match = data.party
    ? existing.find(c => c.party && c.party.toLowerCase() === data.party.toLowerCase())
    : null;
  if (match) { updateBudgetConsultant(catId, match.id, data); return 'updated'; }
  addBudgetConsultant(catId, data);
  return 'added';
}

/**
 * Update an existing invoice or add a new one.
 * Match priority: invoice number → party + date + net.
 * Returns 'updated' | 'added'.
 */
function upsertInvoice(catId, data) {
  const existing = getPanelData().categories.find(c => c.id === catId)?.budget?.invoices || [];
  let match = null;
  if (data.invoiceNumber) {
    match = existing.find(i => i.invoiceNumber && i.invoiceNumber === data.invoiceNumber);
  }
  if (!match && data.party && data.invoiceDate && data.net) {
    match = existing.find(i =>
      i.party?.toLowerCase() === data.party?.toLowerCase() &&
      i.invoiceDate === data.invoiceDate &&
      i.net === data.net,
    );
  }
  if (match) { updateBudgetInvoice(catId, match.id, data); return 'updated'; }
  addBudgetInvoice(catId, data);
  return 'added';
}

// ── Totals per consultant derived from invoices ───────────────────────────────

function getConsultantTotals(consultantId, invoices) {
  const linked = invoices.filter(i => i.consultantId === consultantId);
  return {
    invoiced: linked.reduce((s, i) => s + num(i.net), 0),
    paid:     linked.filter(i => i.status === 'Paid').reduce((s, i) => s + num(i.net), 0),
    accounts: linked.filter(i => ['Pending', 'Approved'].includes(i.status)).reduce((s, i) => s + num(i.net), 0),
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
          h('th', { class: 'bgt-r bgt-auto-hdr' }, 'Invoiced'),
          h('th', { class: 'bgt-r bgt-auto-hdr' }, 'Paid'),
          h('th', { class: 'bgt-r' }, 'Balance'),
        )),
        h('tbody', null, ...Object.entries(byCategory).map(([k, v]) => dataRow(k, v))),
        h('tfoot', null, dataRow('Total', tots, 'bgt-total')),
      ),
    ),
  );
}

// ── Consultants / Budget table ────────────────────────────────────────────────

const APPOINTED = ['—', 'Yes', 'No', 'Partial', 'Terminated'];

function doneCheckbox(checked, onChange) {
  const el = h('input', { type: 'checkbox', class: 'bgt-done-chk', title: 'Invoicing complete', tabindex: '-1' });
  el.checked = !!checked;
  el.addEventListener('change', e => onChange(e.target.checked));
  return el;
}

function buildConsultants(catId, consultants, invoices) {
  const cfItems    = getPanelData().categories.find(c => c.id === catId)?.budget?.cashflow?.items || [];
  const allCatOpts = catOpts(consultants);

  // Returns array of TR elements: [consultantRow, ...phaseRows, addPhaseRow]
  const rows = consultants.flatMap(c => {
    const upd    = patch => updateBudgetConsultant(catId, c.id, patch);
    const phases = c.phases || [];
    const budget = num(c.quote) * (1 + num(c.contingencyPct) / 100);
    const totals = getConsultantTotals(c.id, invoices);
    const balance = budget - totals.invoiced;

    const hasActivity = num(c.quote) > 0 || totals.invoiced > 0;
    let balanceCls = balance < 0 ? 'bgt-over' : '';
    if (balance >= 0 && hasActivity) {
      balanceCls = c.invoicingDone ? 'bgt-bal-done' : 'bgt-bal-ongoing';
    }

    const rowSubCatOpts = subCatOpts(consultants, cfItems, c.category);

    // ── Expand toggle ─────────────────────────────────────────────────────────
    const isExpanded  = _expandedCons.has(c.id);
    const expandBtn   = h('button', {
      class: `bgt-expand-btn${phases.length ? '' : ' bgt-expand-empty'}`,
      title: isExpanded ? 'Collapse phases' : 'Expand phases',
    }, isExpanded ? '▼' : (phases.length ? '▶' : '＋'));

    // ── Phase rows (built upfront, visibility toggled without re-render) ──────
    const phaseEls = phases.map(p => {
      const updP = patch => updateConsultantPhase(catId, c.id, p.id, patch);
      const row  = h('tr', { class: 'bgt-phase-row' },
        h('td', { class: 'bgt-phase-label-cell', colSpan: 7 },
          h('div', { class: 'bgt-phase-indent' },
            h('span', { class: 'bgt-phase-tree' }, '└'),
            inp(p.label,  'Phase label…', v => updP({ label: v })),
          ),
        ),
        h('td', { class: 'bgt-r' }, inp(p.amount,  '0',        v => updP({ amount: v }),  'number')),
        h('td', null,                inp(p.timing,  'e.g. 3-5', v => updP({ timing: v }))),
        h('td', { class: 'bgt-r bgt-auto bgt-phase-calc' }, fmt(num(p.amount))),
        h('td', { colSpan: 6 }),
        h('td', null, delBtn(() => deleteConsultantPhase(catId, c.id, p.id))),
      );
      row.style.display = isExpanded ? '' : 'none';
      return row;
    });

    // ── "Add phase" row ───────────────────────────────────────────────────────
    const addPhaseBtn = h('button', { class: 'bgt-add-phase-btn' }, '＋ Add phase');
    addPhaseBtn.addEventListener('click', () =>
      addConsultantPhase(catId, c.id, { label: '', amount: '', timing: '' }),
    );
    const addPhaseRow = h('tr', { class: 'bgt-phase-add-row' },
      h('td', { colSpan: 17 }, addPhaseBtn),
    );
    addPhaseRow.style.display = isExpanded ? '' : 'none';

    // ── Expand click handler ──────────────────────────────────────────────────
    expandBtn.addEventListener('click', () => {
      const nowOpen = _expandedCons.has(c.id);
      if (nowOpen) _expandedCons.delete(c.id);
      else         _expandedCons.add(c.id);
      const show = !nowOpen;
      phaseEls.forEach(r => { r.style.display = show ? '' : 'none'; });
      addPhaseRow.style.display = show ? '' : 'none';
      expandBtn.textContent = show ? '▼' : (phases.length ? '▶' : '＋');
      expandBtn.title       = show ? 'Collapse phases' : 'Expand phases';
    });

    // ── Consultant row ────────────────────────────────────────────────────────
    const consRow = h('tr', { class: `bgt-cons-row${phases.length ? ' bgt-has-phases' : ''}` },
      h('td', null,
        h('div', { class: 'bgt-party-cell' },
          expandBtn,
          inp(c.party, 'Party', v => upd({ party: v })),
        ),
      ),
      td(inp(c.company,        'Company',      v => upd({ company: v }))),
      td(inp(c.contact,        'Contact',      v => upd({ contact: v }))),
      td(selStr(c.appointed || '—', APPOINTED, v => upd({ appointed: v }))),
      td(inp(c.discipline,     'Discipline',   v => upd({ discipline: v }))),
      td(catSel(c.category,    allCatOpts,     'Category',     v => upd({ category: v }))),
      td(catSel(c.subCategory, rowSubCatOpts,  'Sub-Category', v => upd({ subCategory: v }))),
      phases.length
        ? calcTd(fmt(phases.reduce((s, p) => s + num(p.amount), 0)), 'bgt-phases-total')
        : td(inp(c.quote, '0', v => upd({ quote: v }), 'number'), 'bgt-r'),
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

    return [consRow, ...phaseEls, addPhaseRow];
  });

  const addBtn = h('button', { class: 'bgt-add-btn' }, '+ Add consultant');
  addBtn.addEventListener('click', () =>
    addBudgetConsultant(catId, {
      party: '', company: '', contact: '', appointed: '—',
      discipline: '', category: '', subCategory: '',
      quote: '', contingencyPct: '10', invoicingDone: false, comments: '',
    }),
  );

  // CSV button is rendered in the import bar above the table, not in the actions row
  const consCsvBtn = buildCSVUploadBtn(
    'consultants',
    rawRows => ({
      rows: rawRows
        .map(row => ({
          party:          get(row, 'party', 'firm', 'name', 'supplier', 'consultant'),
          company:        get(row, 'company'),
          contact:        get(row, 'contact', 'person', 'email', 'e-mail', 'email address'),
          appointed:      get(row, 'appointed') || '—',
          discipline:     get(row, 'discipline'),
          category:       get(row, 'category', 'cat'),
          subCategory:    get(row, 'sub-category', 'subcategory', 'sub category', 'sub'),
          quote:          cleanNumber(get(row, 'quote', 'fee', 'amount', 'quote ')),
          contingencyPct: normaliseContingency(cleanNumber(get(row, 'contingency', 'cont', 'cont %', 'contingency %'))),
          invoicingDone:  false,
          comments:       get(row, 'comments', 'notes', 'comment'),
        }))
        .filter(r => r.party),
      columns: [
        { label: 'Party',       key: 'party' },
        { label: 'Company',     key: 'company' },
        { label: 'Contact',     key: 'contact' },
        { label: 'Discipline',  key: 'discipline' },
        { label: 'Category',    key: 'category' },
        { label: 'Sub-Cat',     key: 'subCategory' },
        { label: 'Quote £',     key: 'quote' },
        { label: 'Cont %',      key: 'contingencyPct' },
        { label: 'Appointed',   key: 'appointed' },
        { label: 'Comments',    key: 'comments' },
      ],
    }),
    rows => rows.forEach(r => upsertConsultant(catId, r)),
  );

  const consTable = h('table', { class: 'bgt-table' },
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
      h('th', { class: 'bgt-r bgt-auto-hdr' }, 'Accounts £'),
      h('th', { class: 'bgt-r bgt-auto-hdr' }, 'Paid £'),
      h('th', { class: 'bgt-r bgt-auto-hdr' }, 'Invoiced £'),
      h('th', { class: 'bgt-r bgt-auto-hdr' }, 'Balance £'),
      h('th', { class: 'bgt-done-hdr', title: 'Tick when invoicing is complete — balance turns green' }, 'Done?'),
      h('th', null, 'Comments'),
      h('th', null, ''),
    )),
    h('tbody', null, ...rows),
  );
  addColHighlight(consTable);

  const block = h('div', { class: 'bgt-block' });
  block.appendChild(h('div', { class: 'bgt-block-title' }, 'Consultants'));
  block.appendChild(h('div', { class: 'bgt-scroll' }, consTable));
  const clearAllConsBtn = h('button', { class: 'bgt-danger-btn', title: 'Delete all consultants' }, '🗑 Clear all');
  clearAllConsBtn.addEventListener('click', async () => {
    const n = consultants.length;
    if (!n) return;
    const ok = await showConfirm({ title: 'Clear all consultants?', lines: [`This will permanently delete all ${n} consultant row${n !== 1 ? 's' : ''}.`], confirmText: 'Delete all' });
    if (ok) clearBudgetConsultants(catId);
  });

  const actionsRow = h('div', { class: 'bgt-actions-row' },
    h('div', { class: 'bgt-actions-left' }, addBtn),
    h('div', { class: 'bgt-actions-right' }, clearAllConsBtn),
  );
  block.appendChild(actionsRow);
  return { block, csvBtn: consCsvBtn };
}

// ── Invoice tracker ───────────────────────────────────────────────────────────

const STATUSES  = ['Pending', 'Approved', 'Paid', 'Disputed'];
const DOC_TYPES = ['Invoice', 'Undertaking', 'Payable', 'Quote'];

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

// ── Category / sub-category select dropdowns ─────────────────────────────────

/**
 * A <select> dropdown for category/sub-category.
 * Includes all known options plus a "＋ Add new…" sentinel that temporarily
 * swaps the select for a text input, then adds the typed value to the list.
 *
 * @param {string}   val         Current value
 * @param {string[]} knownOpts   Array of existing option strings
 * @param {string}   placeholder Label shown in the blank option
 * @param {Function} onChange    Called with the new string value
 */
function catSel(val, knownOpts, placeholder, onChange) {
  // Dedupe and preserve the current value even if it's not in the known list
  const opts = [...new Set(knownOpts.filter(Boolean))];
  if (val && !opts.includes(val)) opts.unshift(val);

  // Wrapper keeps the same DOM node when we swap select ↔ input
  const wrap = h('div', { class: 'bgt-cat-wrap' });

  function buildSel(current) {
    const sel = h('select', { class: 'bgt-inp bgt-cat-sel' });
    sel.appendChild(h('option', { value: '' }, `— ${placeholder} —`));
    opts.forEach(o => {
      const opt = h('option', { value: o }, o);
      if (o === current) opt.selected = true;
      sel.appendChild(opt);
    });
    sel.appendChild(h('option', { value: '__new__', class: 'bgt-cat-new-opt' }, '＋ Add new…'));
    if (!current) sel.value = '';

    sel.addEventListener('change', e => {
      if (e.target.value === '__new__') {
        // Swap select → text input
        const ti = h('input', { class: 'bgt-inp bgt-cat-new-inp', placeholder: `New ${placeholder}…` });
        wrap.replaceChildren(ti);
        ti.focus();
        const commit = () => {
          const v = ti.value.trim();
          if (v && !opts.includes(v)) opts.push(v);
          wrap.replaceChildren(buildSel(v || current));
          if (v) onChange(v);
        };
        ti.addEventListener('blur', commit);
        ti.addEventListener('keydown', ke => {
          if (ke.key === 'Enter')  { ke.preventDefault(); ti.blur(); }
          if (ke.key === 'Escape') { wrap.replaceChildren(buildSel(current)); }
        });
      } else {
        onChange(e.target.value);
      }
    });
    return sel;
  }

  wrap.appendChild(buildSel(val || ''));
  return wrap;
}

/** Derives the unique category list from consultants. */
function catOpts(consultants) {
  return [...new Set(consultants.map(c => c.category).filter(Boolean))];
}

/**
 * Derives sub-category options from:
 *  1. Existing subCategory values on consultants
 *  2. Cashflow item labels that belong to `filterCat` (if supplied)
 * This pre-populates the dropdown with the line-item names visible in the cashflow view.
 */
function subCatOpts(consultants, cfItems, filterCat) {
  const fromConsultants = consultants
    .filter(c => !filterCat || c.category === filterCat)
    .map(c => c.subCategory)
    .filter(Boolean);

  const fromCashflow = (cfItems || [])
    .filter(i => !filterCat || i.category === filterCat)
    .map(i => i.label)
    .filter(Boolean);

  return [...new Set([...fromConsultants, ...fromCashflow])];
}

// ── Party datalist — suggests from budget consultants, autofills on match ─────
function partyCell(inv, consultants, catId) {
  const listId = `bgt-pl-${catId}`;
  const el = h('input', { class: 'bgt-inp', value: inv.party ?? '', placeholder: 'Party', list: listId });

  const applyValue = (val, saveAlways = false) => {
    const match = consultants.find(c => c.party && c.party === val);
    if (match) {
      updateBudgetInvoice(catId, inv.id, {
        party:        val,
        company:      match.company     || '',
        discipline:   match.discipline  || '',
        category:     match.category    || '',
        subCategory:  match.subCategory || '',
        consultantId: match.id,
      });
    } else if (saveAlways) {
      updateBudgetInvoice(catId, inv.id, { party: val, consultantId: '' });
    }
  };

  el.addEventListener('input',  e => applyValue(e.target.value, false));
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

// ── Filter state (survives store-triggered re-renders) ────────────────────────
const _filterState = {};  // key: `${catId}:inv` or `${catId}:cons`

function buildFilterInput(key, placeholder, onFilter) {
  const el = h('input', {
    class:       'bgt-filter',
    type:        'search',
    placeholder,
    value:       _filterState[key] || '',
  });
  el.addEventListener('input', e => {
    _filterState[key] = e.target.value;
    onFilter(e.target.value);
  });
  return el;
}

function applyRowFilter(tbody, text) {
  const q = text.trim().toLowerCase();
  tbody.querySelectorAll('tr').forEach(row => {
    if (!q) { row.style.display = ''; return; }
    // Cells may contain plain text, <input> values, or <select> values
    const hit = [...row.querySelectorAll('td')].some(td => {
      if (td.textContent.trim().toLowerCase().includes(q)) return true;
      return [...td.querySelectorAll('input, select')].some(el =>
        (el.value || '').toLowerCase().includes(q)
      );
    });
    row.style.display = hit ? '' : 'none';
  });
}

// ── Row selection ─────────────────────────────────────────────────────────────
let _selCatId = null;
const selectedInvoiceIds = new Set();

function clearSelectionIfNeeded(catId) {
  if (_selCatId !== catId) { selectedInvoiceIds.clear(); _selCatId = catId; }
}

function buildInvoiceTable(catId, invoices, consultants, onSelectionChange) {
  clearSelectionIfNeeded(catId);
  ensurePartyDatalist(catId, consultants);
  const cfItems    = getPanelData().categories.find(c => c.id === catId)?.budget?.cashflow?.items || [];
  const allCatOpts = catOpts(consultants);

  const allIds = invoices.map(i => i.id);

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

    // Sub-cat options filtered to this invoice's category
    const invSubCatOpts = subCatOpts(consultants, cfItems, inv.category);

    const row = h('tr', null,
      td(rowChk, 'bgt-sel-cell'),
      td(partyCell(inv, consultants, catId)),
      td(inp(inv.company,       'Company',      v => upd({ company: v }))),
      td(inp(inv.project,       'Project',      v => upd({ project: v }))),
      td(inp(inv.dm,            'DM',           v => upd({ dm: v }))),
      td(inp(inv.spvName,       'SPV Name',     v => upd({ spvName: v }))),
      td(selStr(inv.documentType || 'Invoice', DOC_TYPES, v => upd({ documentType: v }))),
      td(inp(inv.discipline,    'Discipline',   v => upd({ discipline: v }))),
      td(catSel(inv.category,    allCatOpts,    'Category',     v => upd({ category: v }))),
      td(catSel(inv.subCategory, invSubCatOpts, 'Sub-Category', v => upd({ subCategory: v }))),
      td(inp(inv.invoiceDate,   '',             v => upd({ invoiceDate: v }),  'date')),
      td(inp(inv.invoiceNumber, 'Inv #',        v => upd({ invoiceNumber: v }))),
      td(inp(inv.dueDate,       '',             v => upd({ dueDate: v }),      'date')),
      td(selStr(inv.status || 'Pending', STATUSES, v => upd({ status: v }))),
      td(inp(inv.net, '0', v => {
        const patch = { net: v };
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

  const invTable = h('table', { class: 'bgt-table' },
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
  );
  addColHighlight(invTable);

  const block = h('div', { class: 'bgt-block' });
  block.appendChild(h('div', { class: 'bgt-scroll' }, invTable));

  // Apply any active filter immediately after building
  const invTbody = block.querySelector('tbody');
  applyRowFilter(invTbody, _filterState[`${catId}:inv`] || '');

  const deleteSelBtn = h('button', { class: 'bgt-danger-btn', title: 'Delete selected rows' }, '🗑 Delete selected');
  deleteSelBtn.style.display = selectedInvoiceIds.size > 0 ? '' : 'none';
  deleteSelBtn.addEventListener('click', async () => {
    const ids = [...selectedInvoiceIds];
    const n   = ids.length;
    const ok  = await showConfirm({ title: `Delete ${n} invoice${n !== 1 ? 's' : ''}?`, lines: [`This will permanently delete ${n} selected row${n !== 1 ? 's' : ''}.`], confirmText: 'Delete' });
    if (ok) { selectedInvoiceIds.clear(); deleteBudgetInvoices(catId, ids); }
  });

  const clearAllInvBtn = h('button', { class: 'bgt-danger-btn', title: 'Delete all invoices' }, '🗑 Clear all');
  clearAllInvBtn.addEventListener('click', async () => {
    const n = invoices.length;
    if (!n) return;
    const ok = await showConfirm({ title: 'Clear all invoices?', lines: [`This will permanently delete all ${n} invoice row${n !== 1 ? 's' : ''}.`], confirmText: 'Delete all' });
    if (ok) { selectedInvoiceIds.clear(); clearBudgetInvoices(catId); }
  });

  // Show/hide delete-selected whenever selection changes
  const origOnSelectionChange = onSelectionChange;
  onSelectionChange = () => {
    deleteSelBtn.style.display = selectedInvoiceIds.size > 0 ? '' : 'none';
    origOnSelectionChange?.();
  };
  rowChkEls.forEach(chk => chk.addEventListener('change', () => {
    deleteSelBtn.style.display = selectedInvoiceIds.size > 0 ? '' : 'none';
  }));
  headerChk.addEventListener('change', () => {
    deleteSelBtn.style.display = selectedInvoiceIds.size > 0 ? '' : 'none';
  });

  const actionsRow = h('div', { class: 'bgt-actions-row' },
    h('div', { class: 'bgt-actions-left' }, addBtn),
    h('div', { class: 'bgt-actions-right' }, deleteSelBtn, clearAllInvBtn),
  );
  block.appendChild(actionsRow);
  return block;
}

// ── Exports ───────────────────────────────────────────────────────────────────

export function buildBudgetView(catId) {
  const cat    = getPanelData().categories.find(c => c.id === catId);
  const budget = cat?.budget || { consultants: [], invoices: [] };
  const frag   = document.createDocumentFragment();
  const { block: consBlock, csvBtn: consCsvBtn } = buildConsultants(catId, budget.consultants, budget.invoices);

  // Apply any active filter to the consultant tbody immediately after build
  const consTbody = consBlock.querySelector('tbody');
  applyRowFilter(consTbody, _filterState[`${catId}:cons`] || '');

  const consFilterInput = buildFilterInput(`${catId}:cons`, 'Search party, discipline, category…', q => {
    applyRowFilter(consTbody, q);
  });

  // Inject filter next to the Consultants title
  const consTitle = consBlock.querySelector('.bgt-block-title');
  if (consTitle) {
    const titleWrap = h('div', { class: 'bgt-title-row' });
    consTitle.replaceWith(titleWrap);
    titleWrap.appendChild(h('div', { class: 'bgt-block-title' }, 'Consultants'));
    titleWrap.appendChild(consFilterInput);
  }

  frag.appendChild(h('div', { class: 'bgt-xlsx-bar' },
    h('span', { class: 'bgt-xlsx-bar-label' }, 'Import:'),
    buildExcelImportBtn(catId),
    consCsvBtn,
  ));

  // Show "Load sample data" banner when budget is empty
  if (!budget.consultants.length) {
    const sampleBtn = h('button', { class: 'cf-sample-btn' }, '↓ Load sample data');
    sampleBtn.addEventListener('click', () => loadBudgetSample(catId));
    const banner = h('div', { class: 'cf-empty-banner' },
      h('div', { class: 'cf-empty-title' }, 'No consultants yet'),
      h('div', { class: 'cf-empty-sub' }, 'Add consultants manually, import via CSV/Excel, or load sample data to explore.'),
      sampleBtn,
    );
    frag.appendChild(banner);
  }

  const pivot = buildPivot(budget.consultants, budget.invoices);
  if (pivot) frag.appendChild(pivot);
  frag.appendChild(consBlock);
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

  const invCsvBtn = buildCSVUploadBtn(
    'invoices',
    rawRows => {
      const consultants = getPanelData().categories.find(c => c.id === catId)?.budget?.consultants || [];
      const rows = rawRows
        .map(row => {
          const party  = get(row, 'party', 'firm', 'supplier', 'vendor', 'name');
          const invNum = get(row, 'invoice #', 'invoice number', 'inv #', 'inv no', 'ref', 'invoice no');
          const match  = consultants.find(c => c.party && c.party.toLowerCase() === party.toLowerCase());
          return {
            party,
            company:       match?.company     || get(row, 'company'),
            project:       get(row, 'project') || bibleField(catId, 'project', 'project name'),
            dm:            get(row, 'dm', 'development manager') || bibleField(catId, 'dm', 'development manager', 'project manager'),
            spvName:       get(row, 'spv name', 'spv') || bibleField(catId, 'spv name', 'spv', 'spv entity'),
            documentType:  get(row, 'doc type', 'document type', 'type') || 'Invoice',
            discipline:    match?.discipline  || get(row, 'discipline'),
            category:      match?.category    || get(row, 'category', 'cat'),
            subCategory:   match?.subCategory || get(row, 'sub-category', 'subcategory', 'sub category', 'sub'),
            invoiceDate:   cleanDate(get(row, 'invoice date', 'date')),
            invoiceNumber: invNum,
            dueDate:       cleanDate(get(row, 'due date')),
            status:        get(row, 'status') || 'Pending',
            net:           cleanNumber(get(row, 'net', 'net ', 'net amount', 'amount', 'ex vat', 'excl vat')),
            vat:           cleanNumber(get(row, 'vat', 'vat ', 'tax')),
            accountsDate:  cleanDate(get(row, 'accounts date', 'accounts')),
            paidDate:      cleanDate(get(row, 'paid date', 'paid')),
            comment:       get(row, 'comment', 'comments', 'notes'),
            consultantId:  match?.id || '',
          };
        })
        .filter(r => r.party || r.invoiceNumber);
      return {
        rows,
        columns: [
          { label: 'Party',        key: 'party' },
          { label: 'Invoice #',    key: 'invoiceNumber' },
          { label: 'Invoice Date', key: 'invoiceDate' },
          { label: 'Doc Type',     key: 'documentType' },
          { label: 'Net £',        key: 'net' },
          { label: 'VAT £',        key: 'vat' },
          { label: 'Status',       key: 'status' },
          { label: 'Category',     key: 'category' },
          { label: 'Due Date',     key: 'dueDate' },
          { label: 'Comment',      key: 'comment' },
        ],
      };
    },
    rows => rows.forEach(r => upsertInvoice(catId, r)),
  );

  frag.appendChild(h('div', { class: 'bgt-xlsx-bar' },
    h('span', { class: 'bgt-xlsx-bar-label' }, 'Import:'),
    buildExcelImportBtn(catId),
    invCsvBtn,
  ));
  const invFilterInput = buildFilterInput(`${catId}:inv`, 'Search party, invoice #, status…', q => {
    const tbody = document.querySelector('.bgt-table tbody');
    if (tbody) applyRowFilter(tbody, q);
  });

  const titleRow = h('div', { class: 'bgt-title-row' },
    h('div', { class: 'bgt-block-title' }, 'Payment Tracker'),
    invFilterInput,
    copyBtn,
  );
  frag.appendChild(titleRow);
  frag.appendChild(buildInvoiceTable(catId, budget.invoices, budget.consultants, () => copyBtn.refresh()));
  return frag;
}
