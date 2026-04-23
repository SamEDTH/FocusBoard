/**
 * Calendar service — Google Calendar (PKCE) + Microsoft Outlook (MSAL)
 *
 * Google uses a manual PKCE authorization code flow via popup (no GIS library,
 * no storagerelay, no backend needed). Refresh tokens are stored so the user
 * only needs to sign in once.
 *
 * Outlook uses MSAL.js popup flow.
 */

import { getGoogleProviderToken, isSupabaseConfigured } from './supabase.js';

const CAL_KEY = 'focusboard_calendar';

// ── Timezone helper ───────────────────────────────────────────────────────────

/** Returns the local UTC offset string, e.g. '+01:00' for BST, '-05:00' for EST. */
function localTzOffset() {
  const off = new Date().getTimezoneOffset(); // minutes, positive = west of UTC
  const abs  = Math.abs(off);
  const sign = off <= 0 ? '+' : '-';
  return `${sign}${String(Math.floor(abs / 60)).padStart(2, '0')}:${String(abs % 60).padStart(2, '0')}`;
}

/** Builds a RFC3339 datetime string for the start/end of a local date. */
function localDayBounds(dateStr) {
  const tz = localTzOffset();
  return { start: `${dateStr}T00:00:00${tz}`, end: `${dateStr}T23:59:59${tz}` };
}

// ── Persistence ───────────────────────────────────────────────────────────────

function load() {
  try { return JSON.parse(localStorage.getItem(CAL_KEY) || '{}'); } catch { return {}; }
}
function save(s) {
  try { localStorage.setItem(CAL_KEY, JSON.stringify(s)); } catch {}
}

let state = load();

export function getCalendarState() { return state; }
// Google is connected if: (a) manually connected via PKCE, or (b) signed in via Supabase Google OAuth with calendar token
export function isGoogleConnected()    { return !!(state.google?.accessToken || state.google?.refreshToken || state.googleViaSupabase); }
export function isGoogleViaSupabase()  { return !!state.googleViaSupabase; }
export function isOutlookConnected()   { return !!(state.outlook?.clientId); }
export function isAnyConnected()       { return isGoogleConnected() || isOutlookConnected(); }

/** Called after Supabase sign-in with the provider token — auto-connects Google Calendar. */
export function setGoogleFromSupabase(accessToken, expiresAt) {
  if (!accessToken) return;
  state.googleViaSupabase = { accessToken, expiresAt };
  save(state);
}

// ── Script loader ─────────────────────────────────────────────────────────────

function loadScript(src) {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) return resolve();
    const s = document.createElement('script');
    s.src = src; s.async = true;
    s.onload = resolve;
    s.onerror = () => reject(new Error(`Failed to load ${src}`));
    document.head.appendChild(s);
  });
}

// ── Google PKCE helpers ───────────────────────────────────────────────────────

function randomBase64url(bytes = 48) {
  const arr = new Uint8Array(bytes);
  crypto.getRandomValues(arr);
  return btoa(String.fromCharCode(...arr))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

async function sha256Base64url(str) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
  return btoa(String.fromCharCode(...new Uint8Array(buf)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

// ── Google Calendar (manual PKCE popup — no GIS library) ─────────────────────

const GOOGLE_CAL_BASE  = 'https://www.googleapis.com/calendar/v3';
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GOOGLE_CAL_SCOPE = 'https://www.googleapis.com/auth/calendar';

export async function connectGoogle(clientId, clientSecret) {
  const verifier   = randomBase64url(48);
  const challenge  = await sha256Base64url(verifier);
  const stateParam = randomBase64url(16);
  const redirectUri = location.origin;

  const authUrl = 'https://accounts.google.com/o/oauth2/v2/auth?' + new URLSearchParams({
    client_id:             clientId,
    redirect_uri:          redirectUri,
    response_type:         'code',
    scope:                 GOOGLE_CAL_SCOPE,
    code_challenge:        challenge,
    code_challenge_method: 'S256',
    access_type:           'offline',
    prompt:                'consent',
    state:                 stateParam,
  });

  const popup = window.open(authUrl, '_blank', 'width=520,height=640,left=300,top=100');
  if (!popup) throw new Error('Popup was blocked — please allow popups for this site and try again.');

  // Poll the popup until it lands back on our origin with ?code=
  const code = await new Promise((resolve, reject) => {
    const timer = setInterval(() => {
      try {
        if (popup.closed) {
          clearInterval(timer);
          reject(new Error('Sign-in window was closed — please try again.'));
          return;
        }
        const url = new URL(popup.location.href);
        if (url.origin !== location.origin) return; // still on Google — keep waiting
        clearInterval(timer);
        popup.close();
        const err = url.searchParams.get('error');
        if (err) return reject(new Error(err === 'access_denied' ? 'Access was denied.' : err));
        const returnedState = url.searchParams.get('state');
        if (returnedState !== stateParam) return reject(new Error('State mismatch — please try again.'));
        const c = url.searchParams.get('code');
        if (!c) return reject(new Error('No authorisation code received.'));
        resolve(c);
      } catch {
        // Cross-origin error — popup still on Google domain, keep polling
      }
    }, 250);

    setTimeout(() => {
      clearInterval(timer);
      if (!popup.closed) popup.close();
      reject(new Error('Sign-in timed out.'));
    }, 5 * 60_000);
  });

  // Exchange code for tokens
  const resp = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id:     clientId,
      ...(clientSecret ? { client_secret: clientSecret } : {}),
      redirect_uri:  redirectUri,
      grant_type:    'authorization_code',
      code_verifier: verifier,
    }),
  });
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({}));
    throw new Error(err.error_description || err.error || `Token exchange failed (${resp.status})`);
  }
  const tokens = await resp.json();
  state.google = {
    clientId,
    clientSecret:  clientSecret || null,
    accessToken:  tokens.access_token,
    refreshToken: tokens.refresh_token,
    expiresAt:    Date.now() + (tokens.expires_in - 60) * 1000,
  };
  save(state);
}

export function disconnectGoogle() {
  if (state.google?.accessToken) {
    fetch(`https://oauth2.googleapis.com/revoke?token=${state.google.accessToken}`, { method: 'POST' }).catch(() => {});
  }
  delete state.google;
  delete state.googleViaSupabase;
  save(state);
}

async function getGoogleToken() {
  // ── Supabase-managed token (signed in via Google OAuth) ────────────────────
  if (state.googleViaSupabase) {
    if (Date.now() < state.googleViaSupabase.expiresAt - 60_000) {
      return state.googleViaSupabase.accessToken;
    }
    // Token nearing expiry — ask Supabase for a fresh one
    const fresh = await getGoogleProviderToken();
    if (fresh) {
      state.googleViaSupabase.accessToken = fresh;
      state.googleViaSupabase.expiresAt   = Date.now() + 55 * 60_000;
      save(state);
      return fresh;
    }
    // Couldn't refresh — clear so UI shows reconnect prompt
    delete state.googleViaSupabase;
    save(state);
    return null;
  }

  // ── Manual PKCE token ──────────────────────────────────────────────────────
  if (!state.google) return null;
  if (Date.now() < state.google.expiresAt) return state.google.accessToken;
  if (!state.google.refreshToken) throw new Error('Google Calendar session expired — please reconnect.');

  const resp = await fetch(GOOGLE_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id:     state.google.clientId,
      ...(state.google.clientSecret ? { client_secret: state.google.clientSecret } : {}),
      grant_type:    'refresh_token',
      refresh_token: state.google.refreshToken,
    }),
  });
  if (!resp.ok) throw new Error('Google token refresh failed — please reconnect.');
  const tokens = await resp.json();
  state.google.accessToken = tokens.access_token;
  state.google.expiresAt   = Date.now() + (tokens.expires_in - 60) * 1000;
  save(state);
  return state.google.accessToken;
}

async function googleFetch(path, options = {}) {
  const token = await getGoogleToken();
  if (!token) throw new Error('Google Calendar not connected');
  const resp = await fetch(`${GOOGLE_CAL_BASE}${path}`, {
    ...options,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', ...(options.headers || {}) },
  });
  if (!resp.ok) throw new Error(`Google API error: ${resp.status}`);
  return resp.json();
}

export async function getGoogleEvents(startISO, endISO) {
  const params = new URLSearchParams({
    timeMin: startISO, timeMax: endISO,
    singleEvents: 'true', orderBy: 'startTime', maxResults: '100',
  });
  const data = await googleFetch(`/calendars/primary/events?${params}`);
  return normaliseEvents(data.items || [], 'google');
}

export async function createGoogleEvent(title, body, startISO, endISO) {
  return googleFetch('/calendars/primary/events', {
    method: 'POST',
    body: JSON.stringify({
      summary:     `[Focus] ${title}`,
      description: body,
      start: { dateTime: startISO, timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone },
      end:   { dateTime: endISO,   timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone },
      colorId: '7',
    }),
  });
}

// ── Microsoft Outlook (MSAL.js popup) ────────────────────────────────────────

const MS_GRAPH  = 'https://graph.microsoft.com/v1.0';
const MS_SCOPES = ['Calendars.ReadWrite'];
let _msalInstance = null;

async function getMsal(clientId) {
  await loadScript('https://alcdn.msauth.net/browser/2.38.3/js/msal-browser.min.js');
  if (!_msalInstance || _msalInstance.config.auth.clientId !== clientId) {
    _msalInstance = new window.msal.PublicClientApplication({
      auth: { clientId, redirectUri: location.origin },
      cache: { cacheLocation: 'localStorage' },
    });
    await _msalInstance.initialize();
  }
  return _msalInstance;
}

export async function connectOutlook(clientId) {
  const msal   = await getMsal(clientId);
  const result = await msal.loginPopup({ scopes: MS_SCOPES });
  state.outlook = { clientId, homeAccountId: result.account.homeAccountId };
  save(state);
}

export function disconnectOutlook() {
  delete state.outlook;
  save(state);
  _msalInstance = null;
}

async function getOutlookToken() {
  if (!state.outlook) return null;
  const msal     = await getMsal(state.outlook.clientId);
  const accounts = msal.getAllAccounts();
  const account  = accounts.find(a => a.homeAccountId === state.outlook.homeAccountId) || accounts[0];
  if (!account) throw new Error('Outlook account not found — please reconnect.');
  const result = await msal.acquireTokenSilent({ scopes: MS_SCOPES, account });
  return result.accessToken;
}

async function outlookFetch(path, options = {}) {
  const token = await getOutlookToken();
  const resp  = await fetch(`${MS_GRAPH}${path}`, {
    ...options,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', ...(options.headers || {}) },
  });
  if (!resp.ok) throw new Error(`Graph API error: ${resp.status}`);
  return resp.json();
}

export async function getOutlookEvents(startISO, endISO) {
  const params = new URLSearchParams({
    startDateTime: startISO, endDateTime: endISO,
    $select: 'subject,start,end,isAllDay',
    $orderby: 'start/dateTime', $top: '100',
  });
  const data = await outlookFetch(`/me/calendarView?${params}`);
  return normaliseEvents(data.value || [], 'outlook');
}

export async function createOutlookEvent(title, body, startISO, endISO) {
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  return outlookFetch('/me/events', {
    method: 'POST',
    body: JSON.stringify({
      subject: `[Focus] ${title}`,
      body:    { contentType: 'text', content: body },
      start:   { dateTime: startISO.replace('Z', ''), timeZone: tz },
      end:     { dateTime: endISO.replace('Z', ''),   timeZone: tz },
      categories: ['Focusboard'],
    }),
  });
}

// ── Normalise events ──────────────────────────────────────────────────────────

function normaliseEvents(items, provider) {
  return items
    .filter(e => provider === 'google' ? !!e.start?.dateTime : !e.isAllDay)
    .map(e => ({
      id:    e.id,
      title: provider === 'google' ? e.summary : e.subject,
      start: new Date(provider === 'google' ? e.start.dateTime : e.start.dateTime).getTime(),
      end:   new Date(provider === 'google' ? e.end.dateTime   : e.end.dateTime).getTime(),
    }));
}

// ── Unified API ───────────────────────────────────────────────────────────────

export async function getEvents(dateStr) {
  const { start, end } = localDayBounds(dateStr);
  if (isGoogleConnected())  return getGoogleEvents(start, end);
  if (isOutlookConnected()) return getOutlookEvents(start, end);
  return [];
}

/** Creates a focus-block event in the connected calendar via the API. */
export async function bookFocusBlock(task, startISO, endISO) {
  const notes = [
    task.dueDate  ? `Due: ${task.dueDate}` : '',
    task.timeNeeded ? `Duration: ${Math.round(task.timeNeeded)} min` : '',
    task.notes    ? task.notes            : '',
  ].filter(Boolean).join('\n');
  if (isGoogleConnected())  return createGoogleEvent(task.title, notes, startISO, endISO);
  if (isOutlookConnected()) return createOutlookEvent(task.title, notes, startISO, endISO);
  throw new Error('No calendar connected');
}

/**
 * Fetches all [Focus] focus-block events from the connected calendar (yesterday → +60 days)
 * and matches them against stored focus sessions on each task.
 *
 * Returns a map: taskId → array of per-session status objects:
 *   { status: 'ok' | 'cancelled' | 'rescheduled' | 'past' | 'unknown',
 *     newStart?: string, newEnd?: string }   // only when rescheduled
 */
export async function syncFocusSessions(tasks) {
  if (!isGoogleConnected()) return null;

  const today     = new Date(); today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1);
  const inSixty   = new Date(today); inSixty.setDate(inSixty.getDate() + 60);

  const p       = n => String(n).padStart(2, '0');
  const dateFmt = d => `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;

  // Fetch all [Focus] events across every calendar the user can read
  let calIds = ['primary'];
  try {
    const cl = await googleFetch('/users/me/calendarList?minAccessRole=freeBusyReader');
    if (cl.items?.length) calIds = cl.items.map(c => c.id);
  } catch { /* fallback to primary */ }

  const qs = new URLSearchParams({
    q: '[Focus]',
    timeMin:       `${dateFmt(yesterday)}T00:00:00${localTzOffset()}`,
    timeMax:       `${dateFmt(inSixty)}T23:59:59${localTzOffset()}`,
    singleEvents:  'true',
    maxResults:    '250',
    showDeleted:   'false',
  });

  const fetched = await Promise.all(calIds.map(async id => {
    try {
      const d = await googleFetch(`/calendars/${encodeURIComponent(id)}/events?${qs}`);
      return (d.items || []).filter(e => e.start?.dateTime && e.status !== 'cancelled');
    } catch { return []; }
  }));
  const calEvents = fetched.flat();

  // Build sync map
  const syncMap = {};
  for (const task of tasks) {
    const sessions = task.focusSessions?.length
      ? task.focusSessions
      : (task.focusBlock ? [task.focusBlock] : []);
    if (!sessions.length) continue;

    const expectedTitle = `[Focus] ${task.title}`;
    const taskEvents    = calEvents.filter(e => e.summary === expectedTitle);

    syncMap[task.id] = sessions.map(session => {
      if (!session.startISO) return { status: 'unknown' };

      // Sessions >1 day in the past — don't bother checking
      const sessionDate = new Date(`${session.date || session.startISO.slice(0, 10)}T00:00:00`);
      if (sessionDate < yesterday) return { status: 'past' };

      const sessionMs = new Date(session.startISO).getTime();

      // Exact match: event starts within 5 minutes of stored time
      if (taskEvents.some(e => Math.abs(new Date(e.start.dateTime).getTime() - sessionMs) < 5 * 60_000)) {
        return { status: 'ok' };
      }

      // Same-day match: event exists but at a different time (rescheduled)
      const sessionDateStr = session.date || session.startISO.slice(0, 10);
      const sameDay = taskEvents.find(e => {
        const d = new Date(e.start.dateTime);
        return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}` === sessionDateStr;
      });
      if (sameDay) {
        const ns = new Date(sameDay.start.dateTime);
        const ne = new Date(sameDay.end.dateTime);
        const fmt = d => d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
        return { status: 'rescheduled', newStart: fmt(ns), newEnd: fmt(ne) };
      }

      // Not found in calendar → overridden / cancelled
      return { status: 'cancelled' };
    });
  }

  return syncMap;
}

/**
 * Returns a "create event" URL for Google Calendar or Outlook.
 * The event is pre-filled with the task title, duration, and notes.
 * Epoch ms values are formatted as LOCAL time so the calendar shows
 * the correct time without UTC conversion artefacts.
 */
export function buildCalendarOpenUrl(startMs) {
  // Open the calendar in day view for the selected date so the user can
  // see their full schedule and click to place the event (tetris-style).
  // Google: /calendar/r/day/YYYY/M/D  (month has no leading zero)
  // Outlook: /calendar/0/view/day/YYYY-MM-DD
  const d = new Date(startMs);
  const y = d.getFullYear();
  const m = d.getMonth() + 1;      // no leading zero for Google
  const dd = d.getDate();
  const p  = n => String(n).padStart(2, '0');

  if (isGoogleConnected()) {
    return `https://calendar.google.com/calendar/r/day/${y}/${m}/${dd}`;
  }
  if (isOutlookConnected()) {
    return `https://outlook.live.com/calendar/0/view/day/${y}-${p(m)}-${p(dd)}`;
  }
  return null;
}

/** The event title to copy to clipboard so the user can paste it when clicking a slot. */
export function getFocusEventTitle(task) {
  return task.title;   // plain title — no prefix needed since user pastes it themselves
}

// ── Busy period fetchers (all calendars) ─────────────────────────────────────

/**
 * Fetches timed (non all-day) events from ALL of the user's calendars in
 * parallel, then returns their start/end as busy periods.
 * Using events (not FreeBusy) lets us filter out all-day events which would
 * otherwise block the entire day.
 */
async function getGoogleBusyPeriods(startISO, endISO) {
  // Get all calendar IDs (all calendars — reader and above — affect availability)
  let calIds = ['primary'];
  try {
    const calList = await googleFetch('/users/me/calendarList?minAccessRole=freeBusyReader');
    if (calList.items?.length) calIds = calList.items.map(c => c.id);
  } catch { /* use primary only */ }

  // Fetch timed events from every calendar in parallel
  const results = await Promise.all(calIds.map(async calId => {
    try {
      const params = new URLSearchParams({
        timeMin: startISO, timeMax: endISO,
        singleEvents: 'true', maxResults: '250',
        showDeleted: 'false',
      });
      const data = await googleFetch(`/calendars/${encodeURIComponent(calId)}/events?${params}`);
      const events = (data.items || []).filter(e => {
        if (!e.start?.dateTime) return false;            // exclude all-day events
        if (e.status === 'cancelled') return false;      // exclude cancelled events
        if (e.transparency === 'transparent') return false; // exclude "show as free" events
        // Exclude events the user has explicitly declined
        const selfAttendee = e.attendees?.find(a => a.self);
        if (selfAttendee?.responseStatus === 'declined') return false;
        return true;
      });
      console.log(`[FocusBoard] Calendar "${calId}": ${events.length} busy event(s)`, events.map(e => ({
        title: e.summary, start: e.start.dateTime, end: e.end.dateTime,
        status: e.status, transparency: e.transparency,
      })));
      return events.map(e => ({
        start: new Date(e.start.dateTime).getTime(),
        end:   new Date(e.end.dateTime).getTime(),
      }));
    } catch (err) {
      console.warn(`[FocusBoard] Failed to fetch calendar "${calId}":`, err.message);
      return [];
    }
  }));

  return results.flat();
}

/**
 * Gets timed (non all-day) Outlook events as busy periods.
 */
async function getOutlookBusyPeriods(startISO, endISO) {
  const events = await getOutlookEvents(startISO, endISO);
  return events.map(e => ({ start: e.start, end: e.end }));
}

// ── Free slot finder ──────────────────────────────────────────────────────────

/**
 * Total free minutes within working hours today.
 * Used by the priority competition system to gauge calendar pressure.
 */
export async function getTotalFreeMinutes(dateStr, workStart = '09:30', workEnd = '17:30', bufferMins = 15) {
  const { start: startISO, end: endISO } = localDayBounds(dateStr);

  let rawBusy = [];
  if (isGoogleConnected())       rawBusy = await getGoogleBusyPeriods(startISO, endISO);
  else if (isOutlookConnected()) rawBusy = await getOutlookBusyPeriods(startISO, endISO);

  const wsMs  = parseLocalTime(dateStr, workStart);
  const weMs  = parseLocalTime(dateStr, workEnd);
  const bufMs = bufferMins * 60_000;

  const busy = rawBusy
    .map(b => ({ start: b.start - bufMs, end: b.end + bufMs }))
    .sort((a, b) => a.start - b.start);

  const merged = [];
  for (const b of busy) {
    if (merged.length && b.start <= merged[merged.length - 1].end) {
      merged[merged.length - 1].end = Math.max(merged[merged.length - 1].end, b.end);
    } else {
      merged.push({ ...b });
    }
  }

  let freeMs = 0;
  let cursor = wsMs;
  for (const block of merged) {
    const bStart = Math.max(block.start, wsMs);
    const bEnd   = Math.min(block.end,   weMs);
    if (bStart > cursor) freeMs += bStart - cursor;
    if (bEnd   > cursor) cursor  = bEnd;
  }
  if (weMs > cursor) freeMs += weMs - cursor;

  return Math.round(freeMs / 60_000);
}

export async function getFreeSlots(dateStr, durationMins, workStart = '09:30', workEnd = '17:30', bufferMins = 15) {
  const { start: startISO, end: endISO } = localDayBounds(dateStr);

  // Fetch busy periods from ALL calendars
  let rawBusy = [];
  if (isGoogleConnected())       rawBusy = await getGoogleBusyPeriods(startISO, endISO);
  else if (isOutlookConnected()) rawBusy = await getOutlookBusyPeriods(startISO, endISO);

  const wsMs  = parseLocalTime(dateStr, workStart);
  const weMs  = parseLocalTime(dateStr, workEnd);
  const durMs = durationMins * 60_000;
  const bufMs = bufferMins   * 60_000;

  const toLocal = ms => new Date(ms).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
  console.log(`[FocusBoard] getFreeSlots ${dateStr}: workStart=${workStart}(${toLocal(wsMs)}) workEnd=${workEnd}(${toLocal(weMs)}) dur=${durationMins}m buf=${bufferMins}m rawBusy=${rawBusy.length}`);

  // Add buffer around each busy block then sort
  const busy = rawBusy
    .map(b => ({ start: b.start - bufMs, end: b.end + bufMs }))
    .sort((a, b) => a.start - b.start);

  // Merge overlapping/adjacent busy blocks
  const merged = [];
  for (const b of busy) {
    if (merged.length && b.start <= merged[merged.length - 1].end) {
      merged[merged.length - 1].end = Math.max(merged[merged.length - 1].end, b.end);
    } else {
      merged.push({ ...b });
    }
  }
  console.log(`[FocusBoard] Merged busy blocks:`, merged.map(b => `${toLocal(b.start)}–${toLocal(b.end)}`));

  // Find gaps within working hours
  const slots = [];
  let cursor  = wsMs;
  for (const block of merged) {
    if (block.start > cursor && block.start - cursor >= durMs) {
      collectSlots(slots, cursor, block.start, durMs);
    }
    cursor = Math.max(cursor, block.end);
  }
  if (weMs - cursor >= durMs) collectSlots(slots, cursor, weMs, durMs);

  console.log(`[FocusBoard] Found ${slots.length} free slot(s). cursor after blocks=${toLocal(cursor)}, weMs=${toLocal(weMs)}, remaining=${Math.round((weMs-cursor)/60000)}m`);
  return slots;
}

function parseLocalTime(dateStr, hhmm) {
  return new Date(`${dateStr}T${hhmm}:00`).getTime();
}

function collectSlots(slots, from, to, durMs) {
  const step = 15 * 60_000;
  let t = Math.ceil(from / step) * step;
  while (t + durMs <= to) {
    const s = new Date(t);
    const e = new Date(t + durMs);
    slots.push({
      startMs:  t,
      endMs:    t + durMs,
      startISO: s.toISOString(),
      endISO:   e.toISOString(),
      label:    `${fmt(s)} – ${fmt(e)}`,
    });
    t += step;
  }
}

function fmt(d) {
  return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}
