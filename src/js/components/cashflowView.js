import { h } from '../dom.js';
import { getPanelData, updateCashflowSettings, addBudgetConsultant, updateBudgetConsultant, updateConsultantPhase, updateSubCategoryOrder } from '../store.js';

const num     = v => parseFloat(v) || 0;
const fmtK    = v => { const n = num(v); return n === 0 ? '—' : '£' + n.toLocaleString('en-GB', { minimumFractionDigits: 0, maximumFractionDigits: 0 }); };
const fmtCell = v => (!v || v < 0.005) ? '' : '£' + Math.round(v).toLocaleString('en-GB');

// ── Timing helpers ─────────────────────────────────────────────────────────────

function parseTimingMonths(timing) {
  if (!timing?.trim()) return [];
  const s = timing.trim();
  const r = s.match(/^(\d+)\s*-\s*(\d+)$/);
  if (r) {
    const lo = Math.min(+r[1], +r[2]), hi = Math.max(+r[1], +r[2]);
    return Array.from({ length: hi - lo + 1 }, (_, i) => lo + i);
  }
  return s.split(',').map(n => parseInt(n.trim())).filter(n => !isNaN(n) && n > 0).sort((a, b) => a - b);
}

function formatTiming(months) {
  if (!months.length) return '';
  const s = [...months].sort((a, b) => a - b);
  if (s.length >= 2 && s.every((m, i) => i === 0 || m === s[i - 1] + 1)) return `${s[0]}-${s[s.length - 1]}`;
  return s.join(',');
}

function shiftTiming(timing, delta) {
  if (!delta) return timing;
  const months = parseTimingMonths(timing);
  if (!months.length) return timing;
  return formatTiming(months.map(m => m + delta).filter(m => m >= 1));
}

function resizeTiming(timing, delta) {
  if (!delta) return timing;
  const months = parseTimingMonths(timing);
  if (!months.length) return timing;
  const last = months[months.length - 1], newLast = Math.max(months[0], last + delta);
  const isRange = months.length >= 2 && months.every((m, i) => i === 0 || m === months[i - 1] + 1);
  if (isRange || months.length === 1) return `${months[0]}-${newLast}`;
  if (delta > 0) { const e = [...months]; for (let i = 0; i < delta; i++) e.push(e[e.length - 1] + 1); return formatTiming(e); }
  return formatTiming(months.slice(0, Math.max(1, months.length + delta)));
}

function getMonthAmounts(amount, timing, numMonths) {
  const months = parseTimingMonths(timing), total = num(amount), arr = new Array(numMonths).fill(0);
  if (!months.length || !total) return arr;
  const perMonth = total / months.length;
  months.forEach(m => { if (m >= 1 && m <= numMonths) arr[m - 1] += perMonth; });
  return arr;
}

function getMonthLabels(projectStart, numMonths) {
  if (!projectStart) return Array.from({ length: numMonths }, (_, i) => `M${i + 1}`);
  const [y, mo] = projectStart.split('-').map(Number);
  return Array.from({ length: numMonths }, (_, i) => {
    const d = new Date(y, mo - 1 + i, 1);
    return d.toLocaleDateString('en-GB', { month: 'short', year: '2-digit' });
  });
}

// ── Colour palette ─────────────────────────────────────────────────────────────

const CAT_COLOURS = [
  { bg: '#FEF08A', border: '#EAB308', text: '#713F12' },
  { bg: '#BBF7D0', border: '#22C55E', text: '#14532D' },
  { bg: '#BFDBFE', border: '#3B82F6', text: '#1E3A5F' },
  { bg: '#FED7AA', border: '#F97316', text: '#7C2D12' },
  { bg: '#E9D5FF', border: '#A855F7', text: '#4A1D96' },
  { bg: '#FBCFE8', border: '#EC4899', text: '#831843' },
  { bg: '#A5F3FC', border: '#06B6D4', text: '#164E63' },
];
const catColour = idx => CAT_COLOURS[idx % CAT_COLOURS.length];

// ── Drag state ─────────────────────────────────────────────────────────────────

let _drag   = null;
let _scDrag = null;

function cleanupDrag() {
  document.removeEventListener('mousemove', onDragMove);
  document.removeEventListener('mouseup', onDragUp);
  _drag = null;
}

function onDragMove(e) {
  if (!_drag) return;
  const delta = Math.round((e.clientX - _drag.startX) / _drag.colWidth);
  if (delta === _drag.lastDelta) return;
  _drag.lastDelta = delta;
  const preview = _drag.resizing ? resizeTiming(_drag.origTiming, delta) : shiftTiming(_drag.origTiming, delta);
  _drag.previewTiming = preview;
  const pm = new Set(parseTimingMonths(preview));
  _drag.rowCells.forEach((cell, i) => {
    cell.classList.toggle('cf-active',   pm.has(i + 1));
    cell.classList.toggle('cf-inactive', !pm.has(i + 1));
  });
  if (_drag.timingEl) _drag.timingEl.textContent = preview || '—';
}

function onDragUp() {
  if (!_drag) return;
  if (_drag.lastDelta && _drag.previewTiming != null) _drag.onCommit(_drag.previewTiming);
  cleanupDrag();
}

// ── Sample data ────────────────────────────────────────────────────────────────
// One budget row per party+sub-category. Phases are optional further breakdown.

const SAMPLE_CONSULTANTS = [
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

export function loadBudgetSampleData(catId) {
  const existing     = getPanelData().categories.find(c => c.id === catId)?.budget?.consultants || [];
  const existingKeys = new Set(existing.map(c => `${c.category}|${c.subCategory}|${c.party}`));
  SAMPLE_CONSULTANTS.forEach(c => {
    if (!existingKeys.has(`${c.category}|${c.subCategory}|${c.party}`)) addBudgetConsultant(catId, c);
  });
  updateCashflowSettings(catId, { numMonths: 24 });
}

function loadSampleData(catId) { loadBudgetSampleData(catId); }

// ── Main view ──────────────────────────────────────────────────────────────────

export function buildCashflowView(catId) {
  const cat         = getPanelData().categories.find(c => c.id === catId);
  const budget      = cat?.budget || {};
  const cf          = budget.cashflow || {};
  const consultants = budget.consultants || [];
  const numM        = cf.numMonths    || 24;
  const start       = cf.projectStart || '';
  const labels      = getMonthLabels(start || null, numM);
  const showDetail  = cf.showDetail === true;

  // Unique categories in insertion order
  const allCats = [...new Set(consultants.map(c => c.category || 'General').filter(Boolean))];
  if (!allCats.length) allCats.push('General');

  // ── Bar items for a consultant ─────────────────────────────────────────────
  // Returns drawable rows: phases if present, otherwise the consultant itself.
  // Each item carries its own onUpdateTiming so callers never need to branch.
  function getBarItems(cons) {
    const phases = cons.phases || [];
    if (phases.length) {
      return phases.map(p => ({
        label:          p.label || '',
        amount:         p.amount,
        timing:         p.timing || '',
        onUpdateTiming: v => updateConsultantPhase(catId, cons.id, p.id, { timing: v }),
      }));
    }
    return [{
      label:          cons.subCategory || cons.party,
      amount:         cons.quote,
      timing:         cons.timing || '',
      onUpdateTiming: v => updateBudgetConsultant(catId, cons.id, { timing: v }),
    }];
  }

  // ── Sub-category ordering ─────────────────────────────────────────────────
  const scOrderMap = budget.subCategoryOrder || {};

  /** Merge stored order with natural (insertion) order, appending any new entries. */
  function applyScOrder(catName, natural) {
    const stored  = scOrderMap[catName] || [];
    const ordered = stored.filter(s => natural.includes(s));
    const missing = natural.filter(s => !ordered.includes(s));
    return [...ordered, ...missing];
  }

  /** Wire HTML5 drag-to-reorder on a sub-category heading row. */
  function makeScDraggable(tr, catName, scName, scOrder) {
    tr.draggable = true;
    tr.addEventListener('dragstart', e => {
      _scDrag = { catName, scName };
      tr.classList.add('cf-sc-dragging');
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', scName);
    });
    tr.addEventListener('dragend', () => {
      tr.classList.remove('cf-sc-dragging');
      document.querySelectorAll('.cf-sc-drag-over').forEach(el => el.classList.remove('cf-sc-drag-over'));
      _scDrag = null;
    });
    tr.addEventListener('dragover', e => {
      if (!_scDrag || _scDrag.catName !== catName || _scDrag.scName === scName) return;
      e.preventDefault();
      document.querySelectorAll('.cf-sc-drag-over').forEach(el => el.classList.remove('cf-sc-drag-over'));
      tr.classList.add('cf-sc-drag-over');
    });
    tr.addEventListener('dragleave', e => {
      if (!tr.contains(e.relatedTarget)) tr.classList.remove('cf-sc-drag-over');
    });
    tr.addEventListener('drop', e => {
      if (!_scDrag || _scDrag.catName !== catName || _scDrag.scName === scName) return;
      e.preventDefault();
      tr.classList.remove('cf-sc-drag-over');
      const fromIdx = scOrder.indexOf(_scDrag.scName);
      const toIdx   = scOrder.indexOf(scName);
      if (fromIdx === -1 || toIdx === -1) return;
      const newOrder = [...scOrder];
      newOrder.splice(fromIdx, 1);
      newOrder.splice(toIdx, 0, _scDrag.scName);
      updateSubCategoryOrder(catId, catName, newOrder);
    });
  }

  // ── Column tracking ────────────────────────────────────────────────────────
  const colCells   = Array.from({ length: numM }, () => []);
  const colHeaders = [];
  let   selMonthIdx = null;

  const inspectPanel = h('div', { class: 'cf-detail-panel' });
  inspectPanel.style.display = 'none';

  function buildInspectContent(idx) {
    inspectPanel.innerHTML = '';
    const active = [];
    allCats.forEach((catName, ci) => {
      consultants.filter(c => (c.category || 'General') === catName).forEach(cons => {
        getBarItems(cons).forEach(item => {
          if (!parseTimingMonths(item.timing).includes(idx + 1)) return;
          active.push({ catName, ci, label: item.label, party: cons.party, amount: getMonthAmounts(item.amount, item.timing, numM)[idx] });
        });
      });
    });
    const grandTotal = active.reduce((s, i) => s + i.amount, 0);
    const grouped    = {};
    active.forEach(i => { if (!grouped[i.catName]) grouped[i.catName] = []; grouped[i.catName].push(i); });

    const hdr = h('div', { class: 'cf-dp-hdr' },
      h('span', { class: 'cf-dp-title' }, labels[idx]),
      h('span', { class: 'cf-dp-count' }, `${active.length} item${active.length !== 1 ? 's' : ''}`),
      h('span', { class: 'cf-dp-total' }, `Total: ${fmtK(grandTotal)}`),
      h('button', { class: 'cf-dp-close' }, '×'),
    );
    hdr.querySelector('.cf-dp-close').addEventListener('click', deselectMonth);
    inspectPanel.appendChild(hdr);
    if (!active.length) {
      inspectPanel.appendChild(h('div', { class: 'cf-dp-empty' }, 'No items scheduled this month'));
    } else {
      const list = h('div', { class: 'cf-dp-list' });
      allCats.forEach((catName, ci) => {
        if (!grouped[catName]) return;
        const colour   = catColour(ci);
        const catTotal = grouped[catName].reduce((s, i) => s + i.amount, 0);
        const section  = h('div', { class: 'cf-dp-section' });
        section.appendChild(h('div', { class: 'cf-dp-cat' },
          h('span', { class: 'cf-dp-cat-dot', style: { background: colour.border } }),
          h('span', { class: 'cf-dp-cat-name' }, catName),
          h('span', { class: 'cf-dp-cat-total' }, fmtK(catTotal)),
        ));
        grouped[catName].forEach(i => section.appendChild(h('div', { class: 'cf-dp-item' },
          h('span', { class: 'cf-dp-item-name' }, [i.party, i.label].filter(Boolean).join(' · ')),
          h('span', { class: 'cf-dp-item-amt' },  fmtK(i.amount)),
        )));
        list.appendChild(section);
      });
      inspectPanel.appendChild(list);
    }
  }

  function deselectMonth() {
    if (selMonthIdx !== null) {
      colHeaders[selMonthIdx]?.classList.remove('cf-th-sel');
      colCells[selMonthIdx]?.forEach(c => c.classList.remove('cf-col-sel'));
    }
    selMonthIdx = null;
    inspectPanel.style.display = 'none';
  }

  function selectMonth(idx) {
    if (selMonthIdx === idx) { deselectMonth(); return; }
    deselectMonth();
    selMonthIdx = idx;
    colHeaders[idx]?.classList.add('cf-th-sel');
    colCells[idx]?.forEach(c => c.classList.add('cf-col-sel'));
    buildInspectContent(idx);
    inspectPanel.style.display = '';
  }

  // ── Table header ───────────────────────────────────────────────────────────
  const monthThEls = labels.map((lbl, i) => {
    const th = h('th', { class: `cf-th cf-th-month${i < 2 ? ' cf-th-near' : ''}`, title: `Click to inspect ${lbl}` }, lbl);
    th.style.cursor = 'pointer';
    th.addEventListener('click', () => selectMonth(i));
    colHeaders.push(th);
    return th;
  });

  const thead = h('thead', null, h('tr', null,
    h('th', { class: 'cf-th cf-th-name' },  showDetail ? 'Description' : 'Description'),
    h('th', { class: 'cf-th cf-th-amt' },   showDetail ? 'Party'       : '£ Total'),
    ...(showDetail ? [h('th', { class: 'cf-th cf-th-timing' }, 'Timing')] : []),
    ...monthThEls,
  ));

  const tbody = h('tbody');

  // ── Helpers to add empty cells (for label-only rows) ──────────────────────
  function emptyMonthCells(cls) {
    return Array.from({ length: numM }, (_, mi) => {
      const cell = h('td', { class: cls }, '');
      colCells[mi].push(cell);
      return cell;
    });
  }

  // ── Helper to build a draggable Gantt bar row ──────────────────────────────
  function buildBarRow(item, colour) {
    const months   = parseTimingMonths(item.timing);
    const monthSet = new Set(months);
    const isLastM  = m => months.length > 0 && m === months[months.length - 1];
    const rowCells = [];

    const timingLbl = h('span', { class: 'cf-timing-val' }, item.timing || '—');
    const timingInp = h('input', { class: 'cf-inp cf-inp-timing', value: item.timing || '', placeholder: 'e.g. 3-5' });
    timingInp.style.display = 'none';
    timingLbl.addEventListener('click', () => { timingLbl.style.display = 'none'; timingInp.style.display = ''; timingInp.focus(); timingInp.select(); });
    timingInp.addEventListener('blur',    e => { item.onUpdateTiming(e.target.value); timingInp.style.display = 'none'; timingLbl.style.display = ''; });
    timingInp.addEventListener('keydown', e => { if (e.key === 'Enter') e.target.blur(); });

    const barCells = Array.from({ length: numM }, (_, mi) => {
      const m        = mi + 1;
      const isActive = monthSet.has(m);
      const isFirst  = months.length > 0 && m === months[0];
      const isLast   = isLastM(m);
      const cell = h('td', {
        class: isActive ? `cf-cell cf-active cf-gantt-cell${isLast ? ' cf-last-month' : ''}` : 'cf-cell',
        style: isActive ? { background: colour.bg, borderColor: colour.border, position: 'relative' } : {},
        title: isActive ? item.label : '',
      }, isFirst ? h('span', { class: 'cf-gantt-label', style: { color: colour.text } }, item.label) : '');

      if (isActive) {
        cell.style.cursor = 'grab';
        cell.addEventListener('mousedown', e => {
          if (e.button !== 0) return;
          e.preventDefault();
          const rect     = cell.getBoundingClientRect();
          const resizing = isLast && (e.clientX - rect.left) > rect.width * 0.65;
          _drag = { origTiming: item.timing || '', previewTiming: item.timing || '', startX: e.clientX, colWidth: rect.width, lastDelta: 0, resizing, rowCells, timingEl: timingLbl, onCommit: item.onUpdateTiming };
          document.addEventListener('mousemove', onDragMove);
          document.addEventListener('mouseup',   onDragUp);
        });
      }
      rowCells.push(cell);
      colCells[mi].push(cell);
      return cell;
    });

    return { timingLbl, timingInp, barCells };
  }

  // ── VIEW 1: Numbers / cashflow ─────────────────────────────────────────────
  // Category → Sub-category total rows (all consultant bar items aggregated)
  if (!showDetail) {
    const grandMonthly = new Array(numM).fill(0);

    allCats.forEach((categoryName, catIdx) => {
      const colour    = catColour(catIdx);
      const catConss  = consultants.filter(c => (c.category || 'General') === categoryName);

      // All bar items for this category
      const allItems  = catConss.flatMap(getBarItems);
      const catMonthly = new Array(numM).fill(0);
      allItems.forEach(item => getMonthAmounts(item.amount, item.timing, numM).forEach((v, mi) => { catMonthly[mi] += v; }));
      catMonthly.forEach((v, mi) => { grandMonthly[mi] += v; });
      const catTotal = catConss.reduce((s, c) => s + num(c.quote), 0);

      tbody.appendChild(h('tr', { class: 'cf-cat-row' },
        h('td', { class: 'cf-cat-name' }, categoryName),
        h('td', { class: 'cf-cat-amt' },  fmtK(catTotal)),
        ...catMonthly.map((v, mi) => { const cell = h('td', { class: 'cf-cat-month' }, fmtCell(v) || ''); colCells[mi].push(cell); return cell; }),
      ));

      // Group by sub-category, sum all bar items within each sub-cat
      const scNatural = [], scMap = {};
      catConss.forEach(cons => {
        const sc = cons.subCategory || cons.party;
        if (!scMap[sc]) { scMap[sc] = []; scNatural.push(sc); }
        scMap[sc].push(...getBarItems(cons));
      });
      const scOrder = applyScOrder(categoryName, scNatural);

      scOrder.forEach(scName => {
        const scItems   = scMap[scName];
        const scMonthly = new Array(numM).fill(0);
        scItems.forEach(item => getMonthAmounts(item.amount, item.timing, numM).forEach((v, mi) => { scMonthly[mi] += v; }));
        const scTotal = scItems.reduce((s, item) => s + num(item.amount), 0);

        const scRow = h('tr', { class: 'cf-subcat-row' },
          h('td', { class: 'cf-subcat-name' },
            h('span', { class: 'cf-sc-drag-handle', title: 'Drag to reorder' }, '⠿'),
            scName,
          ),
          h('td', { class: 'cf-subcat-amt' },  fmtK(scTotal)),
          ...scMonthly.map((v, mi) => {
            const isActive = v > 0;
            const cell = h('td', {
              class: isActive ? 'cf-cell cf-active cf-subcat-month' : 'cf-subcat-month',
              style: isActive ? { background: colour.bg, borderColor: colour.border } : {},
            }, fmtCell(v) || '');
            colCells[mi].push(cell);
            return cell;
          }),
        );
        makeScDraggable(scRow, categoryName, scName, scOrder);
        tbody.appendChild(scRow);
      });
    });

    // Total row
    const totalAmt   = consultants.reduce((s, c) => s + num(c.quote), 0);
    tbody.appendChild(h('tr', { class: 'cf-total-row' },
      h('td', { class: 'cf-total-lbl' }, 'Total'),
      h('td', { class: 'cf-total-amt' }, fmtK(totalAmt)),
      ...grandMonthly.map((v, mi) => { const cell = h('td', { class: 'cf-total-cell' }, fmtCell(v) || '—'); colCells[mi].push(cell); return cell; }),
    ));

    // Cumulative row
    let running = 0;
    tbody.appendChild(h('tr', { class: 'cf-cum-row' },
      h('td', { class: 'cf-cum-lbl', colSpan: 2 }, 'Cumulative'),
      ...grandMonthly.map((v, mi) => { running += v; const cell = h('td', { class: 'cf-cum-cell' }, fmtK(running)); colCells[mi].push(cell); return cell; }),
    ));

  // ── VIEW 2: Timeline / Gantt ───────────────────────────────────────────────
  // Category → Sub-category heading → Consultant label → Bar rows (phases)
  } else {
    allCats.forEach((categoryName, catIdx) => {
      const colour   = catColour(catIdx);
      const catConss = consultants.filter(c => (c.category || 'General') === categoryName);
      if (!catConss.length) return;

      // Category header
      tbody.appendChild(h('tr', { class: 'cf-cat-row' },
        h('td', { class: 'cf-cat-name' },   categoryName),
        h('td', { class: 'cf-cat-amt' },    ''),
        h('td', { class: 'cf-cat-timing' }),
        ...emptyMonthCells('cf-cat-month'),
      ));

      // Group consultants by sub-category
      const scNatural = [], scMap = {};
      catConss.forEach(cons => {
        const sc = cons.subCategory || cons.party;
        if (!scMap[sc]) { scMap[sc] = []; scNatural.push(sc); }
        scMap[sc].push(cons);
      });
      const scOrder = applyScOrder(categoryName, scNatural);

      scOrder.forEach(scName => {
        // Sub-category heading
        const scRow = h('tr', { class: 'cf-subcat-row' },
          h('td', { class: 'cf-subcat-name' },
            h('span', { class: 'cf-sc-drag-handle', title: 'Drag to reorder' }, '⠿'),
            scName,
          ),
          h('td', { class: 'cf-subcat-amt' },  ''),
          h('td', { class: 'cf-subcat-timing' }),
          ...emptyMonthCells('cf-subcat-month'),
        );
        makeScDraggable(scRow, categoryName, scName, scOrder);
        tbody.appendChild(scRow);

        scMap[scName].forEach(cons => {
          // Consultant label row
          tbody.appendChild(h('tr', { class: 'cf-cons-lbl-row' },
            h('td', { class: 'cf-cons-lbl-name' }, cons.party || '—'),
            h('td', { class: 'cf-subcat-amt' }, ''),
            h('td', { class: 'cf-subcat-timing' }),
            ...emptyMonthCells('cf-subcat-month'),
          ));

          // Bar rows (one per phase, or one for the consultant itself)
          getBarItems(cons).forEach(item => {
            const { timingLbl, timingInp, barCells } = buildBarRow(item, colour);
            tbody.appendChild(h('tr', { class: 'cf-gantt-row cf-phase-gantt-row' },
              h('td', { class: 'cf-item-name cf-gantt-name cf-phase-indent-name' },
                h('span', { class: 'cf-phase-tree' }, '└'),
                item.label || '—',
              ),
              h('td', { class: 'cf-item-amt' }, ''),
              h('td', { class: 'cf-item-timing' }, timingLbl, timingInp),
              ...barCells,
            ));
          });
        });
      });
    });
  }

  const table = h('table', { class: 'cf-table' }, thead, tbody);

  // ── Settings bar ───────────────────────────────────────────────────────────
  const startInp = h('input', { class: 'cf-setting-inp', type: 'month', value: start || '', title: 'Project start month' });
  startInp.addEventListener('change', e => updateCashflowSettings(catId, { projectStart: e.target.value }));

  const monthsSel = h('select', { class: 'cf-setting-sel' });
  [12, 18, 24, 36, 48].forEach(n => {
    const opt = h('option', { value: n }, `${n} months`);
    if (n === numM) opt.selected = true;
    monthsSel.appendChild(opt);
  });
  monthsSel.addEventListener('change', e => updateCashflowSettings(catId, { numMonths: +e.target.value }));

  const viewToggle = h('button', {
    class: `cf-detail-toggle${showDetail ? ' active' : ''}`,
    title: showDetail ? 'Switch to cashflow numbers view' : 'Switch to timeline view',
  }, showDetail ? '£ Cashflow' : '◫ Timeline');
  viewToggle.addEventListener('click', () => updateCashflowSettings(catId, { showDetail: !showDetail }));

  const settingsBar = h('div', { class: 'cf-settings-bar' },
    h('label', { class: 'cf-setting-label' }, 'Project start'),
    startInp,
    h('label', { class: 'cf-setting-label' }, 'Show'),
    monthsSel,
    h('div', { class: 'cf-settings-spacer' }),
    viewToggle,
  );

  // ── Assemble ───────────────────────────────────────────────────────────────
  const wrap = h('div', { class: 'cf-wrap' });
  wrap.appendChild(settingsBar);
  wrap.appendChild(inspectPanel);

  if (!consultants.length) {
    const banner = h('div', { class: 'cf-empty-banner' },
      h('div', { class: 'cf-empty-title' }, 'No budget data yet'),
      h('div', { class: 'cf-empty-sub' }, 'Add consultants in the Budget tab — their phases will drive the cashflow and timeline automatically.'),
      h('button', { class: 'cf-sample-btn' }, '↓ Load sample data'),
    );
    banner.querySelector('.cf-sample-btn').addEventListener('click', () => loadSampleData(catId));
    wrap.appendChild(banner);
  }

  const scrollWrap = h('div', { class: 'cf-scroll' });
  scrollWrap.appendChild(table);
  wrap.appendChild(scrollWrap);
  return wrap;
}
