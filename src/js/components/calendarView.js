import { h } from '../dom.js';
import { S, set } from '../store.js';
import { getEvents, isAnyConnected } from '../services/calendar.js';

const HOUR_START  = 7;
const HOUR_END    = 21;
const HOUR_HEIGHT = 64; // px per hour
const DAY_NAMES   = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

// ── Date helpers ──────────────────────────────────────────────────────────────

function startOfWeek(date) {
  const d = new Date(date);
  const dow = d.getDay(); // 0=Sun
  d.setDate(d.getDate() - (dow === 0 ? 6 : dow - 1));
  d.setHours(0, 0, 0, 0);
  return d;
}

function addDays(date, n) {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

// Use local date parts — toISOString() returns UTC which shifts the date for UTC+ timezones
function toDateStr(d) {
  return [d.getFullYear(), String(d.getMonth() + 1).padStart(2, '0'), String(d.getDate()).padStart(2, '0')].join('-');
}

function fmtTime(ms) {
  return new Date(ms).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

function fmtWeekLabel(ws) {
  const we   = addDays(ws, 6);
  const opts = { month: 'short', day: 'numeric' };
  const endOpts = { ...opts, year: 'numeric' };
  return `${ws.toLocaleDateString('en-GB', opts)} – ${we.toLocaleDateString('en-GB', endOpts)}`;
}

// ── Calendar view ─────────────────────────────────────────────────────────────

export function buildCalendarView() {
  const weekStart = S.calWeekStart ? new Date(S.calWeekStart + 'T00:00:00') : startOfWeek(new Date());
  const days      = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const todayStr  = toDateStr(new Date());
  const totalHours = HOUR_END - HOUR_START;

  // ── Navigation header ──────────────────────────────────────────────────────

  const header = h('div', { class: 'cal-header' },
    h('div', { class: 'cal-nav' },
      h('button', { class: 'cal-nav-btn', onClick: () => set({ calWeekStart: toDateStr(addDays(weekStart, -7)) }) }, '‹'),
      h('button', { class: 'cal-today-btn', onClick: () => set({ calWeekStart: toDateStr(startOfWeek(new Date())) }) }, 'Today'),
      h('button', { class: 'cal-nav-btn', onClick: () => set({ calWeekStart: toDateStr(addDays(weekStart, 7)) }) }, '›'),
      h('span', { class: 'cal-week-label' }, fmtWeekLabel(weekStart)),
    ),
    !isAnyConnected()
      ? h('span', { class: 'cal-warning' }, '⚠ No calendar connected — connect one in Settings')
      : null,
  );

  // ── Day column headers (sticky) ────────────────────────────────────────────

  const dayHeaders = h('div', { class: 'cal-day-headers' },
    h('div', { class: 'cal-corner' }),
    ...days.map((d, i) => {
      const ds      = toDateStr(d);
      const isToday = ds === todayStr;
      return h('div', { class: `cal-day-header${isToday ? ' today' : ''}` },
        h('span', { class: 'cal-dname' }, DAY_NAMES[i]),
        h('span', { class: `cal-dnum${isToday ? ' today' : ''}` }, d.getDate()),
      );
    }),
  );

  // ── Time labels ────────────────────────────────────────────────────────────

  const timeLabels = h('div', { class: 'cal-time-col' },
    ...Array.from({ length: totalHours }, (_, i) => {
      const h24  = HOUR_START + i;
      const label = h24 === 0 ? '12 AM' : h24 < 12 ? `${h24} AM` : h24 === 12 ? '12 PM' : `${h24 - 12} PM`;
      const el   = h('div', { class: 'cal-time-label' }, label);
      el.style.top = `${i * HOUR_HEIGHT}px`;
      return el;
    }),
  );

  // ── Day columns ────────────────────────────────────────────────────────────

  const dayColumns = days.map(d => {
    const ds  = toDateStr(d);
    const col = h('div', { class: `cal-day-col${ds === todayStr ? ' today' : ''}` });
    col.dataset.date = ds;
    col.style.height = `${totalHours * HOUR_HEIGHT}px`;

    // Hour slot lines
    for (let i = 0; i < totalHours; i++) {
      const line = h('div', { class: 'cal-hour-line' });
      line.style.top = `${i * HOUR_HEIGHT}px`;
      col.appendChild(line);
    }

    // Half-hour lines
    for (let i = 0; i < totalHours; i++) {
      const line = h('div', { class: 'cal-half-line' });
      line.style.top = `${i * HOUR_HEIGHT + HOUR_HEIGHT / 2}px`;
      col.appendChild(line);
    }

    return col;
  });

  const gridBody = h('div', { class: 'cal-grid' },
    timeLabels,
    ...dayColumns,
  );

  // ── Current-time indicator ─────────────────────────────────────────────────

  function updateNowLine() {
    gridBody.querySelectorAll('.cal-now-line, .cal-now-dot').forEach(el => el.remove());
    const now  = new Date();
    const ds   = toDateStr(now);
    const col  = gridBody.querySelector(`[data-date="${ds}"]`);
    if (!col) return;
    const mins = (now.getHours() - HOUR_START) * 60 + now.getMinutes();
    if (mins < 0 || mins > totalHours * 60) return;
    const top  = (mins / 60) * HOUR_HEIGHT;
    const dot  = h('div', { class: 'cal-now-dot' });
    const line = h('div', { class: 'cal-now-line' });
    dot.style.top = line.style.top = `${top}px`;
    col.appendChild(dot);
    col.appendChild(line);
  }

  // ── Event rendering ────────────────────────────────────────────────────────

  function renderEvents(eventsMap) {
    dayColumns.forEach((col, i) => {
      col.querySelectorAll('.cal-event').forEach(el => el.remove());
      const ds     = toDateStr(days[i]);
      const events = eventsMap[ds] || [];

      events.forEach(ev => {
        const s = new Date(ev.start);
        const e = new Date(ev.end);
        const startMins = Math.max(0, (s.getHours() - HOUR_START) * 60 + s.getMinutes());
        const endMins   = Math.min(totalHours * 60, (e.getHours() - HOUR_START) * 60 + e.getMinutes());
        if (endMins <= 0 || startMins >= totalHours * 60 || endMins <= startMins) return;

        const top    = (startMins / 60) * HOUR_HEIGHT;
        const height = Math.max(20, ((endMins - startMins) / 60) * HOUR_HEIGHT - 2);
        const isFocus = (ev.title || '').startsWith('🎯');

        const el = h('div', { class: `cal-event${isFocus ? ' focus' : ''}` },
          h('div', { class: 'cal-event-title' }, ev.title || '(no title)'),
          height > 32 ? h('div', { class: 'cal-event-time' }, `${fmtTime(ev.start)} – ${fmtTime(ev.end)}`) : null,
        );
        el.style.top    = `${top}px`;
        el.style.height = `${height}px`;
        col.appendChild(el);
      });
    });
  }

  // ── Load events ────────────────────────────────────────────────────────────

  const loadingEl = h('div', { class: 'cal-loading' }, 'Loading calendar…');

  async function loadAll() {
    if (!isAnyConnected()) return;
    scrollWrap.appendChild(loadingEl);
    const eventsMap = {};
    await Promise.all(days.map(async d => {
      const ds = toDateStr(d);
      try { eventsMap[ds] = await getEvents(ds); }
      catch { eventsMap[ds] = []; }
    }));
    loadingEl.remove();
    renderEvents(eventsMap);
  }

  // ── Scroll container ───────────────────────────────────────────────────────

  const scrollWrap = h('div', { class: 'cal-scroll' }, gridBody);

  // Scroll to current time (or 8am)
  setTimeout(() => {
    const now  = new Date();
    const mins = (now.getHours() - HOUR_START) * 60 + now.getMinutes();
    scrollWrap.scrollTop = Math.max(0, (mins > 30 ? (mins / 60 - 1) : 0) * HOUR_HEIGHT);
  }, 0);

  updateNowLine();
  loadAll();
  const nowTimer = setInterval(updateNowLine, 60_000);

  // Reload events when a focus block is booked anywhere in the app
  const onBooked = () => loadAll();
  document.addEventListener('focusboard:focus-booked', onBooked);

  // Clean up interval + listener when the view is removed from DOM
  const observer = new MutationObserver(() => {
    if (!document.body.contains(scrollWrap)) {
      clearInterval(nowTimer);
      document.removeEventListener('focusboard:focus-booked', onBooked);
      observer.disconnect();
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });

  return h('div', { class: 'cal-view' },
    header,
    dayHeaders,
    scrollWrap,
  );
}
