import { h } from '../dom.js';
import { getFreeSlots, getEvents, bookFocusBlock, buildCalendarOpenUrl, isAnyConnected } from '../services/calendar.js';
import { addFocusSession, S } from '../store.js';
import { showConfirm } from './confirm.js';

// ── Helpers ───────────────────────────────────────────────────────────────────

function nextDates(n) {
  const dates = [];
  for (let i = 0; i < n; i++) {
    const d = new Date();
    d.setDate(d.getDate() + i);
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

// ── Split options ─────────────────────────────────────────────────────────────

function getSplitOptions(totalMins) {
  const opts = [{
    label:            `Full session (${fmtMins(totalMins)})`,
    sessionDurations: [totalMins],
  }];
  if (totalMins > 60) {
    const hours     = Math.floor(totalMins / 60);
    const remainder = totalMins % 60;
    const durations = [...Array(hours).fill(60), ...(remainder > 0 ? [remainder] : [])];
    if (durations.length > 1) opts.push({ label: buildSplitLabel(durations), sessionDurations: durations });
  }
  return opts;
}

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

// ── Mini day timeline ─────────────────────────────────────────────────────────

const TRACK_H = 300; // px

function buildDayView(calEvents, wsMs, weMs, dateStr) {
  const totalMs = weMs - wsMs;
  const toY = ms => Math.max(0, Math.min(TRACK_H, ((ms - wsMs) / totalMs) * TRACK_H));
  const toH = ms => Math.max(3, (ms / totalMs) * TRACK_H);

  const track = h('div', { class: 'fp-day-track' });

  // Hour gridlines + labels
  const startHour = new Date(wsMs).getHours();
  const endHour   = new Date(weMs).getHours() + 1;
  for (let hr = startHour; hr <= endHour; hr++) {
    const d = new Date(wsMs); d.setHours(hr, 0, 0, 0);
    const y = toY(d.getTime());
    if (y > TRACK_H) break;
    track.appendChild(h('div', { class: 'fp-day-hr', style: { top: `${y}px` } },
      h('span', { class: 'fp-day-hr-lbl' }, `${String(hr).padStart(2, '0')}:00`),
      h('div',  { class: 'fp-day-hr-line' }),
    ));
  }

  // Current time marker (today only)
  const todayStr = (() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; })();
  if (dateStr === todayStr) {
    const nowMs = Date.now();
    if (nowMs >= wsMs && nowMs <= weMs) {
      track.appendChild(h('div', { class: 'fp-day-now', style: { top: `${toY(nowMs)}px` } }));
    }
  }

  // Existing calendar events
  calEvents.forEach(ev => {
    const top = toY(ev.start);
    const hgt = toH(ev.end - ev.start);
    if (top >= TRACK_H) return;
    const el = h('div', { class: 'fp-day-event', style: { top: `${top}px`, height: `${Math.min(hgt, TRACK_H - top)}px` } });
    el.title = ev.title || '';
    el.textContent = ev.title || '';
    track.appendChild(el);
  });

  // Ghost block — shown on slot hover
  const ghost = h('div', { class: 'fp-day-ghost' });
  ghost.style.display = 'none';
  track.appendChild(ghost);

  const el = h('div', { class: 'fp-day-view' }, track);

  return {
    el,
    setHighlight(slot) {
      if (!slot) { ghost.style.display = 'none'; return; }
      const top = toY(slot.startMs);
      const hgt = toH(slot.endMs - slot.startMs);
      ghost.style.display = 'block';
      ghost.style.top     = `${top}px`;
      ghost.style.height  = `${Math.min(hgt, TRACK_H - top)}px`;
    },
  };
}

// ── Main picker ───────────────────────────────────────────────────────────────

export function buildFocusPicker(task, onClose) {
  const totalMins = task.timeNeeded || 60;
  const splitOpts = totalMins > 60 ? getSplitOptions(totalMins) : null;
  const dates     = nextDates(7);

  let selectedDate  = dates[0];
  let selectedSplit = splitOpts ? splitOpts[0] : { label: '', sessionDurations: [totalMins] };
  let bookedCount   = 0;

  const currentMins   = () => selectedSplit.sessionDurations[Math.min(bookedCount, selectedSplit.sessionDurations.length - 1)];
  const totalSessions = () => selectedSplit.sessionDurations.length;

  // ── Progress bar ──────────────────────────────────────────────────────────

  const progressEl = h('div', { class: 'fp-progress' });
  const statusEl   = h('div', { class: 'fp-status' });
  const bodyEl     = h('div', { class: 'fp-body' });

  function updateProgress() {
    progressEl.innerHTML = '';
    const total = totalSessions();
    if (total <= 1) return;
    const nextMins = currentMins();
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

  // ── Load slots + day view ─────────────────────────────────────────────────

  async function loadSlots(dateStr) {
    bodyEl.innerHTML = '';
    statusEl.textContent = '';
    statusEl.style.color = '';

    if (!isAnyConnected()) {
      statusEl.textContent = 'Connect a calendar in Settings to see available slots.';
      return;
    }

    statusEl.textContent = 'Checking your calendar…';
    try {
      const slotMins  = Math.max(currentMins(), S.focusMinBlock ?? 30);
      const workStart = S.workStart || '09:30';
      const workEnd   = S.workEnd   || '17:30';
      const bufMins   = S.focusBuffer ?? 15;
      const wsMs = new Date(`${dateStr}T${workStart}:00`).getTime();
      const weMs = new Date(`${dateStr}T${workEnd}:00`).getTime();

      // Fetch slots and calendar events in parallel
      const [{ slots, mergedBusy }, calEvents] = await Promise.all([
        getFreeSlots(dateStr, slotMins, workStart, workEnd, bufMins),
        getEvents(dateStr).catch(() => []),
      ]);

      statusEl.textContent = '';

      // Build mini day timeline
      const dayView = buildDayView(calEvents, wsMs, weMs, dateStr);

      // Build slot list
      const slotList = h('div', { class: 'fp-slot-list' });
      if (!slots.length) {
        slotList.appendChild(h('div', { class: 'fp-no-slots' }, `No free ${fmtMins(slotMins)} slots`));
        if (mergedBusy.length) {
          const fmtMs = ms => new Date(ms).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
          const busyStr = mergedBusy.map(b => `${fmtMs(b.start)}–${fmtMs(b.end)}`).join('  ·  ');
          slotList.appendChild(h('div', { class: 'fp-busy-hint' }, `Blocked: ${busyStr}`));
        }
      } else {
        slots.forEach(slot => {
          const btn = h('button', { class: 'fp-slot-btn' }, slot.label);
          btn.addEventListener('mouseenter', () => dayView.setHighlight(slot));
          btn.addEventListener('mouseleave', () => dayView.setHighlight(null));
          btn.addEventListener('click', () => { dayView.setHighlight(null); bookSlot(slot); });
          slotList.appendChild(btn);
        });
      }

      bodyEl.appendChild(slotList);
      bodyEl.appendChild(dayView.el);

    } catch (err) {
      statusEl.textContent = `Error: ${err.message}`;
    }
  }

  // ── Book slot ─────────────────────────────────────────────────────────────

  async function bookSlot(slot) {
    const start   = new Date(slot.startISO);
    const end     = new Date(slot.endISO);
    const total   = totalSessions();
    const isLast  = bookedCount + 1 >= total;
    const isSplit = total > 1;
    const dayStr  = start.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });

    const ok = await showConfirm({
      title:       isSplit ? `Book session ${bookedCount + 1} of ${total}?` : 'Book focus block?',
      lines:       [
        `Task: ${task.title}`,
        `${dayStr}, ${fmt(start)} – ${fmt(end)}`,
        `Duration: ${fmtMins(currentMins())}`,
        isSplit && !isLast ? `${total - bookedCount - 1} more session${total - bookedCount - 1 !== 1 ? 's' : ''} to book` : '',
      ].filter(Boolean),
      confirmText: 'Book it',
    });
    if (!ok) return;

    statusEl.textContent = 'Booking…';
    statusEl.style.color = '';

    // Try direct API booking; fall back to opening the calendar in a new tab
    try {
      await bookFocusBlock(task, slot.startISO, slot.endISO);
    } catch {
      const url = buildCalendarOpenUrl(slot.startMs);
      if (url) {
        navigator.clipboard.writeText(task.title).catch(() => {});
        window.open(url, '_blank', 'noopener');
      }
    }

    // Record session locally
    const sessionData = {
      day:      start.toLocaleDateString('en-GB', { weekday: 'short' }),
      date:     start.toLocaleDateString('en-CA'),
      start:    fmt(start),
      end:      fmt(end),
      startISO: slot.startISO,
      endISO:   slot.endISO,
    };
    if (task._onBook) task._onBook(sessionData);
    else addFocusSession(task.id, sessionData);
    bookedCount++;
    updateProgress();
    document.dispatchEvent(new CustomEvent('focusboard:focus-booked'));
    statusEl.textContent = '';

    if (bookedCount >= total) {
      onClose();
    } else {
      statusEl.style.color = '#1D9E75';
      statusEl.textContent = `✓ Session ${bookedCount} booked! Now pick a ${fmtMins(currentMins())} slot.`;
      loadSlots(selectedDate);
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
    bodyEl,
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
