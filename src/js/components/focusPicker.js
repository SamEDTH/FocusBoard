import { h } from '../dom.js';
import { getFreeSlots, bookFocusBlock, isAnyConnected } from '../services/calendar.js';
import { addFocusSession, S } from '../store.js';
import { showConfirm } from './confirm.js';

// ── Helpers ───────────────────────────────────────────────────────────────────

function nextDates(n) {
  const dates = [];
  for (let i = 0; i < n; i++) {
    const d = new Date();
    d.setDate(d.getDate() + i);
    // Use local date (not UTC) so dates don't shift for non-UTC timezones
    const yyyy = d.getFullYear();
    const mm   = String(d.getMonth() + 1).padStart(2, '0');
    const dd   = String(d.getDate()).padStart(2, '0');
    dates.push(`${yyyy}-${mm}-${dd}`);
  }
  return dates;
}

function friendlyDate(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const diff  = Math.round((d - today) / 86_400_000);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Tomorrow';
  return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
}

function fmtMins(mins) {
  if (mins >= 60) {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return m ? `${h}h ${m}m` : `${h}h`;
  }
  return `${mins}m`;
}

function fmt(d) {
  return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

/**
 * Build split options where each session is either:
 *  - The full duration (no split)
 *  - 1-hour blocks + the leftover minutes
 * e.g. 105 mins → [60, 45]; 150 mins → [60, 60, 30]; 120 mins → [60, 60]
 */
function getSplitOptions(totalMins) {
  const opts = [{
    label:            `Full session (${fmtMins(totalMins)})`,
    sessionDurations: [totalMins],
  }];

  if (totalMins > 60) {
    const hours     = Math.floor(totalMins / 60);
    const remainder = totalMins % 60;
    const durations = [...Array(hours).fill(60), ...(remainder > 0 ? [remainder] : [])];

    if (durations.length > 1) {
      opts.push({ label: buildSplitLabel(durations), sessionDurations: durations });
    }
  }

  return opts;
}

/** Turn [60, 60, 45] into "2 × 1h + 45m" */
function buildSplitLabel(durations) {
  const parts = [];
  let i = 0;
  while (i < durations.length) {
    const val = durations[i];
    let count = 1;
    while (i + count < durations.length && durations[i + count] === val) count++;
    parts.push(count > 1 ? `${count} × ${fmtMins(val)}` : fmtMins(val));
    i += count;
  }
  return parts.join(' + ');
}

// ── Main picker ───────────────────────────────────────────────────────────────

export function buildFocusPicker(task, onClose) {
  const totalMins = task.timeNeeded || 60;
  const splitOpts = totalMins > 60 ? getSplitOptions(totalMins) : null;
  const dates     = nextDates(7);

  let selectedDate      = dates[0];
  let selectedSplit     = splitOpts ? splitOpts[0] : { label: '', sessionDurations: [totalMins] };
  let bookedCount       = 0;

  const currentMins = () => selectedSplit.sessionDurations[Math.min(bookedCount, selectedSplit.sessionDurations.length - 1)];
  const totalSessions = () => selectedSplit.sessionDurations.length;

  // ── Slot area ─────────────────────────────────────────────────────────────

  const slotArea  = h('div', { class: 'fp-slots' });
  const statusEl  = h('div', { class: 'fp-status' });
  const progressEl = h('div', { class: 'fp-progress' });

  function updateProgress() {
    progressEl.innerHTML = '';
    const total = totalSessions();
    if (total <= 1) return;

    const remaining = total - bookedCount;
    const nextMins  = currentMins();
    progressEl.appendChild(
      h('div', { class: 'fp-progress-bar' },
        h('span', { class: 'fp-progress-label' },
          bookedCount > 0
            ? `✓ ${bookedCount} booked — pick session ${bookedCount + 1} (${fmtMins(nextMins)})`
            : `Pick ${total} sessions: ${selectedSplit.sessionDurations.map(fmtMins).join(', ')}`,
        ),
        ...selectedSplit.sessionDurations.map((_, i) =>
          h('div', { class: `fp-pip${i < bookedCount ? ' done' : ''}` }),
        ),
      ),
    );
  }

  async function loadSlots(dateStr) {
    slotArea.innerHTML = '';
    statusEl.textContent = '';

    if (!isAnyConnected()) {
      statusEl.textContent = 'Connect a calendar in Settings to see available slots.';
      return;
    }

    statusEl.textContent = 'Checking your calendar…';
    try {
      const slotMins = Math.max(currentMins(), S.focusMinBlock ?? 30);
      const slots = await getFreeSlots(dateStr, slotMins, S.workStart, S.workEnd, S.focusBuffer ?? 15);
      statusEl.textContent = '';

      if (!slots.length) {
        statusEl.textContent = `No free ${fmtMins(currentMins())} slots on ${friendlyDate(dateStr)}.`;
        return;
      }

      slots.forEach(slot => {
        const btn = h('button', { class: 'fp-slot-btn' }, slot.label);
        btn.addEventListener('click', () => confirmSlot(slot));
        slotArea.appendChild(btn);
      });
    } catch (err) {
      statusEl.textContent = `Error: ${err.message}`;
    }
  }

  // ── Confirm & book ────────────────────────────────────────────────────────

  async function confirmSlot(slot) {
    const start    = new Date(slot.startISO);
    const end      = new Date(slot.endISO);
    const dayStr   = start.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'short' });
    const total    = totalSessions();
    const isSplit  = total > 1;
    const isLast   = bookedCount + 1 >= total;

    const ok = await showConfirm({
      title: isSplit ? `Book session ${bookedCount + 1} of ${total}?` : 'Book focus block?',
      lines: [
        `Task: ${task.title}`,
        `Time: ${dayStr}, ${fmt(start)} – ${fmt(end)}`,
        `Duration: ${fmtMins(currentMins())}`,
        isSplit && !isLast
          ? `${total - bookedCount - 1} more session${total - bookedCount - 1 !== 1 ? 's' : ''} to book after this`
          : '',
      ].filter(Boolean),
      confirmText: 'Book it',
    });
    if (!ok) return;

    slotArea.innerHTML = '';
    statusEl.textContent = 'Booking…';

    try {
      await bookFocusBlock(task, slot.startISO, slot.endISO);
      document.dispatchEvent(new CustomEvent('focusboard:focus-booked'));
      const sessionData = {
        day:      start.toLocaleDateString('en-GB', { weekday: 'short' }),
        date:     slot.startISO.slice(0, 10),
        start:    fmt(start),
        end:      fmt(end),
        startISO: slot.startISO,
        endISO:   slot.endISO,
      };
      if (task._onBook) task._onBook(sessionData);
      else addFocusSession(task.id, sessionData);
      bookedCount++;
      updateProgress();

      if (bookedCount >= total) {
        onClose();
      } else {
        statusEl.textContent = '';
        statusEl.style.color = '#1D9E75';
        statusEl.textContent = `✓ Session ${bookedCount} booked! Now pick a ${fmtMins(currentMins())} slot.`;
        loadSlots(selectedDate);
      }
    } catch (err) {
      statusEl.textContent = `Booking failed: ${err.message}`;
    }
  }

  // ── Split selector ────────────────────────────────────────────────────────

  let splitRow = null;
  if (splitOpts && splitOpts.length > 1) {
    const splitBtns = splitOpts.map((opt, i) => {
      const btn = h('button', { class: `fp-split-btn${i === 0 ? ' active' : ''}` }, opt.label);
      btn.addEventListener('click', () => {
        splitBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        selectedSplit = opt;
        bookedCount   = 0;
        updateProgress();
        loadSlots(selectedDate);
      });
      return btn;
    });
    splitRow = h('div', { class: 'fp-split-row' },
      h('span', { class: 'fp-split-label' }, 'Sessions:'),
      ...splitBtns,
    );
  }

  // ── Date tabs ─────────────────────────────────────────────────────────────

  const dateTabs = h('div', { class: 'fp-dates' },
    ...dates.map(d => {
      const btn = h('button', { class: `fp-date-btn${d === selectedDate ? ' active' : ''}` }, friendlyDate(d));
      btn.addEventListener('click', () => {
        selectedDate = d;
        dateTabs.querySelectorAll('.fp-date-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        loadSlots(d);
      });
      return btn;
    }),
  );

  loadSlots(selectedDate);
  updateProgress();

  return h('div', { class: 'focus-picker' },
    h('div', { class: 'fp-header' },
      h('span', { class: 'fp-title' }, `Find a focus slot · ${fmtMins(totalMins)}`),
      h('button', { class: 'fp-close', onClick: onClose }, '×'),
    ),
    splitRow,
    progressEl,
    dateTabs,
    statusEl,
    slotArea,
  );
}

// ── Utility exports ───────────────────────────────────────────────────────────

export function getItemSessions(item) {
  if (item.focusSessions?.length) return item.focusSessions;
  if (item.focusBlock) return [item.focusBlock];
  return [];
}

export function getBookedMins(item) {
  return getItemSessions(item).reduce((sum, s) => {
    if (s.startISO && s.endISO) return sum + (new Date(s.endISO) - new Date(s.startISO)) / 60000;
    const [sh, sm] = (s.start || '0:0').split(':').map(Number);
    const [eh, em] = (s.end   || '0:0').split(':').map(Number);
    return sum + ((eh * 60 + em) - (sh * 60 + sm));
  }, 0);
}
