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
  const s = String(val).replace(/[£$€,\s%]+/g, '').trim();
  return /^-?\d*\.?\d+$/.test(s) ? s : '';
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

/** Looks up a field in a CSV row object by one or more candidate key strings (partial, case-insensitive). */
function get(row, ...candidates) {
  for (const c of candidates) {
    const k = Object.keys(row).find(k => k === c || k.includes(c));
    if (k !== undefined && row[k] !== undefined) return row[k];
  }
  return '';
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
    const ws      = wb.Sheets[sheetName];
    // raw: true  → numbers come back as plain JS numbers (avoids £1,234 formatted strings)
    // cellDates: true → date cells come back as JS Date objects
    const allRows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '', raw: true });

    let type   = null;
    let hdrIdx = -1;
    if ((hdrIdx = detectHeaderRow(allRows, CONS_KWS)) >= 0)      type = 'consultants';
    else if ((hdrIdx = detectHeaderRow(allRows, INV_KWS)) >= 0)  type = 'invoices';

    let objects = [];
    if (hdrIdx >= 0) {
      // Normalise headers: lower-case, strip £ % ? / characters
      const hdrs = allRows[hdrIdx].map(c => String(c ?? '').toLowerCase().replace(/[£%?/]+/g, '').trim());
      objects = allRows.slice(hdrIdx + 1)
        .filter(r => r.some(c => c !== '' && c != null))
        .map(r => {
          const obj = {};
          hdrs.forEach((h, i) => {
            const v = r[i];
            // Date objects → ISO string; everything else → plain string
            if (v instanceof Date) {
              obj[h] = `${v.getFullYear()}-${String(v.getMonth() + 1).padStart(2, '0')}-${String(v.getDate()).padStart(2, '0')}`;
            } else {
              obj[h] = String(v ?? '').trim();
            }
          });
          return obj;
        });
    }
    return { name: sheetName, type, objects };
  });
}

/** Map a raw row object → consultant shape (same field matching as CSV import). */
function mapToConsultant(row) {
  return {
    party:          get(row, 'party', 'firm', 'name'),
    company:        get(row, 'company'),
    contact:        get(row, 'contact'),
    appointed:      get(row, 'appointed') || '—',
    discipline:     get(row, 'discipline'),
    category:       get(row, 'category', 'cat'),
    subCategory:    get(row, 'sub category', 'subcategory', 'sub-category'),
    quote:          cleanNumber(get(row, 'quote', 'fee')),
    contingencyPct: cleanNumber(get(row, 'contingency', 'cont')) || '10',
    invoicingDone:  false,
    comments:       get(row, 'comments', 'notes', 'comment'),
  };
}

/** Map a raw row object → invoice shape, linking to consultants already in the store. */
function mapToInvoice(row, catId) {
  const party  = get(row, 'party', 'firm', 'supplier', 'vendor');
  const invNum = get(row, 'invoice #', 'invoice number', 'inv #', 'inv no');
  const cons   = getPanelData().categories.find(c => c.id === catId)?.budget?.consultants || [];
  const match  = cons.find(c => c.party && c.party.toLowerCase() === party.toLowerCase());
  return {
    party,
    company:       match?.company    || get(row, 'company'),
    project:       get(row, 'project') || bibleField(catId, 'project', 'project name'),
    dm:            get(row, 'dm', 'development manager') || bibleField(catId, 'dm', 'development manager', 'project manager'),
    spvName:       get(row, 'spv company', 'spv name', 'spv') || bibleField(catId, 'spv name', 'spv'),
    documentType:  get(row, 'document', 'doc type', 'type') || 'Invoice',
    discipline:    match?.discipline || get(row, 'discipline'),
    category:      match?.category   || get(row, 'category', 'cat'),
    subCategory:   match?.subCategory || get(row, 'sub category', 'subcategory', 'sub-category'),
    invoiceDate:   cleanDate(get(row, 'invoice date', 'date')),
    invoiceNumber: invNum,
    dueDate:       cleanDate(get(row, 'due date')),
    status:        get(row, 'status') || 'Pending',
    net:           cleanNumber(get(row, 'net value', 'net', 'amount')),
    vat:           cleanNumber(get(row, 'vat')),
    accountsDate:  cleanDate(get(row, 'accounts')),
    paidDate:      cleanDate(get(row, 'paid')),
    comment:       get(row, 'comment', 'comments', 'notes'),
    consultantId:  match?.id || '',
  };
}

const XLSX_COLS = {
  consultants: [
    { label: 'Party',      key: 'party' },
    { label: 'Company',    key: 'company' },
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

  // ── Sheet list ────────────────────────────────────────────────────────────
  const TYPE_LABEL = { consultants: 'Budget / Consultants', invoices: 'Invoices / Payment Tracker' };
  const TYPE_CLS   = { consultants: 'imp-type-cons', invoices: 'imp-type-inv' };

  let activeSheet = sheets.find(s => s.type)?.name;

  const sheetListEl = h('tbody');
  const previewEl   = h('div', { class: 'imp-scroll' });
  const summaryEl   = h('span', { class: 'imp-summary' });
  const importBtn   = h('button', { class: 'imp-btn-confirm' }, 'Import');

  // Count valid rows per sheet (no consultant linking needed for count)
  const countRows = s => s.type === 'consultants'
    ? s.objects.filter(r => get(r, 'party', 'firm', 'name')).length
    : s.objects.filter(r => get(r, 'party', 'firm', 'supplier', 'vendor') || get(r, 'invoice #', 'invoice number', 'inv #', 'inv no')).length;

  const renderAll = () => {
    // Sheet list
    sheetListEl.innerHTML = '';
    sheets.forEach(s => {
      const isOn  = include.get(s.name);
      const count = s.type ? countRows(s) : null;

      const toggle = h('button', { class: `imp-toggle${isOn ? ' imp-toggle-on' : ''}`, disabled: !s.type },
        isOn ? 'Include' : 'Skip',
      );
      if (s.type) {
        toggle.addEventListener('click', () => {
          include.set(s.name, !isOn);
          if (!isOn) activeSheet = s.name;  // switch preview to the newly enabled sheet
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

    // Preview pane
    previewEl.innerHTML = '';
    const sheet = sheets.find(s => s.name === activeSheet);
    if (!sheet || !sheet.type) {
      previewEl.appendChild(h('div', { class: 'imp-empty' }, 'Click a recognised sheet above to preview its data.'));
    } else {
      const cols    = XLSX_COLS[sheet.type];
      // For preview we map against current store (consultant linking will be re-done at import time)
      const mapped  = sheet.type === 'consultants'
        ? sheet.objects.map(mapToConsultant).filter(r => r.party)
        : sheet.objects.map(r => mapToInvoice(r, catId)).filter(r => r.party || r.invoiceNumber);
      const preview = mapped.slice(0, 100);
      if (!preview.length) {
        previewEl.appendChild(h('div', { class: 'imp-empty' }, 'No valid rows found in this sheet.'));
      } else {
        previewEl.appendChild(h('div', { class: 'imp-preview-label' },
          `${sheet.name}  ·  ${TYPE_LABEL[sheet.type]}  ·  ${mapped.length} rows`,
        ));
        const table = h('table', { class: 'imp-table' },
          h('thead', null, h('tr', null, ...cols.map(c => h('th', null, c.label)))),
          h('tbody', null, ...preview.map(row => h('tr', null, ...cols.map(c => {
            const val  = String(row[c.key] ?? '');
            const cell = h('td', null, val);
            if (!val) cell.classList.add('imp-td-empty');
            return cell;
          })))),
        );
        previewEl.appendChild(table);
        if (mapped.length > 100) previewEl.appendChild(h('div', { class: 'imp-more' }, `Showing first 100 of ${mapped.length} rows.`));
      }
    }

    // Footer summary
    const included = sheets.filter(s => s.type && include.get(s.name));
    const total    = included.reduce((n, s) => n + countRows(s), 0);
    const parts    = [];
    const nCons = included.filter(s => s.type === 'consultants').reduce((n, s) => n + countRows(s), 0);
    const nInv  = included.filter(s => s.type === 'invoices').reduce((n, s) => n + countRows(s), 0);
    if (nCons) parts.push(`${nCons} consultant${nCons !== 1 ? 's' : ''}`);
    if (nInv)  parts.push(`${nInv} invoice${nInv !== 1 ? 's' : ''}`);
    summaryEl.textContent = total > 0 ? `Ready to import: ${parts.join(' + ')}` : 'No sheets selected';
    importBtn.disabled    = total === 0;
    importBtn.textContent = total > 0 ? `Import ${total} rows` : 'Import';
  };

  // ── Actual import — consultants FIRST so invoices can link to them ─────────
  importBtn.addEventListener('click', () => {
    const conSheets = sheets.filter(s => s.type === 'consultants' && include.get(s.name));
    const invSheets = sheets.filter(s => s.type === 'invoices'    && include.get(s.name));
    // Consultants first so invoice consultant-ID linking resolves
    conSheets.forEach(s => s.objects.map(mapToConsultant).filter(r => r.party).forEach(r => upsertConsultant(catId, r)));
    // Re-map invoices AFTER consultants are in the store so consultant IDs resolve
    invSheets.forEach(s => s.objects.map(r => mapToInvoice(r, catId)).filter(r => r.party || r.invoiceNumber).forEach(r => upsertInvoice(catId, r)));
    close();
  });

  // ── Assemble dialog ───────────────────────────────────────────────────────
  const dialog = h('div', { class: 'imp-dialog' });
  dialog.appendChild(h('div', { class: 'imp-hdr' },
    h('div', { class: 'imp-hdr-left' },
      h('div', { class: 'imp-title' }, 'Import from Excel'),
      h('div', { class: 'imp-filename' }, filename),
    ),
    h('button', { class: 'imp-x', onClick: close }, '×'),
  ));
  dialog.appendChild(h('div', { class: 'imp-sheet-note' },
    'Values only — formula results are imported, not the formulas themselves. Multi-sheet files are imported in one go; consultants are imported before invoices so budget links resolve correctly.',
  ));
  dialog.appendChild(h('div', { class: 'imp-sheetlist-wrap' },
    h('table', { class: 'imp-sheetlist' },
      h('thead', null, h('tr', null,
        h('th', null, 'Sheet'), h('th', null, 'Detected as'), h('th', null, 'Rows'), h('th', null, ''),
      )),
      sheetListEl,
    ),
  ));
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

  const csvBtn = buildCSVUploadBtn(
    'consultants',
    rawRows => ({
      rows: rawRows
        .map(row => ({
          party:          get(row, 'party', 'firm', 'name', 'supplier', 'consultant'),
          company:        get(row, 'company'),
          contact:        get(row, 'contact', 'person'),
          appointed:      get(row, 'appointed') || '—',
          discipline:     get(row, 'discipline'),
          category:       get(row, 'category', 'cat'),
          subCategory:    get(row, 'sub-category', 'subcategory', 'sub category', 'sub'),
          quote:          cleanNumber(get(row, 'quote', 'fee', 'amount', 'quote ')),
          contingencyPct: cleanNumber(get(row, 'contingency', 'cont', 'cont %', 'contingency %')) || '10',
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

  const block = h('div', { class: 'bgt-block' });
  block.appendChild(h('div', { class: 'bgt-block-title' }, 'Consultants'));
  block.appendChild(h('div', { class: 'bgt-scroll' },
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
        h('th', { class: 'bgt-r bgt-auto-hdr' }, 'Accounts £'),
        h('th', { class: 'bgt-r bgt-auto-hdr' }, 'Paid £'),
        h('th', { class: 'bgt-r bgt-auto-hdr' }, 'Invoiced £'),
        h('th', { class: 'bgt-r bgt-auto-hdr' }, 'Balance £'),
        h('th', { class: 'bgt-done-hdr', title: 'Tick when invoicing is complete — balance turns green' }, 'Done?'),
        h('th', null, 'Comments'),
        h('th', null, ''),
      )),
      h('tbody', null, ...rows),
    ),
  ));
  const actionsRow = h('div', { class: 'bgt-actions-row' });
  actionsRow.appendChild(addBtn);
  actionsRow.appendChild(csvBtn);
  block.appendChild(actionsRow);
  return block;
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

// ── Row selection ─────────────────────────────────────────────────────────────
let _selCatId = null;
const selectedInvoiceIds = new Set();

function clearSelectionIfNeeded(catId) {
  if (_selCatId !== catId) { selectedInvoiceIds.clear(); _selCatId = catId; }
}

function buildInvoiceTable(catId, invoices, consultants, onSelectionChange, csvBtn) {
  clearSelectionIfNeeded(catId);
  ensurePartyDatalist(catId, consultants);

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

  const block = h('div', { class: 'bgt-block' });
  block.appendChild(h('div', { class: 'bgt-scroll' },
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
  ));
  const actionsRow = h('div', { class: 'bgt-actions-row' });
  actionsRow.appendChild(addBtn);
  if (csvBtn) actionsRow.appendChild(csvBtn);
  block.appendChild(actionsRow);
  return block;
}

// ── Exports ───────────────────────────────────────────────────────────────────

export function buildBudgetView(catId) {
  const cat    = getPanelData().categories.find(c => c.id === catId);
  const budget = cat?.budget || { consultants: [], invoices: [] };
  const frag   = document.createDocumentFragment();
  frag.appendChild(h('div', { class: 'bgt-xlsx-bar' },
    h('span', { class: 'bgt-xlsx-bar-label' }, 'Import a multi-sheet spreadsheet to populate both budget and invoices at once:'),
    buildExcelImportBtn(catId),
  ));
  const pivot = buildPivot(budget.consultants, budget.invoices);
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
    h('span', { class: 'bgt-xlsx-bar-label' }, 'Import a multi-sheet spreadsheet to populate both budget and invoices at once:'),
    buildExcelImportBtn(catId),
  ));
  const titleRow = h('div', { class: 'bgt-title-row' },
    h('div', { class: 'bgt-block-title' }, 'Payment Tracker'),
    copyBtn,
  );
  frag.appendChild(titleRow);
  frag.appendChild(buildInvoiceTable(catId, budget.invoices, budget.consultants, () => copyBtn.refresh(), invCsvBtn));
  return frag;
}
