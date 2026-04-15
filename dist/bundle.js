(() => {
  // src/js/constants.js
  var STORAGE_KEY = "focusboard-v3";
  var SETTINGS_KEY = "focusboard-settings";
  var TODAY = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
  var D = (n) => {
    const d = /* @__PURE__ */ new Date();
    d.setDate(d.getDate() + n);
    return d.toISOString().split("T")[0];
  };
  var T = (dayOffset, h2, m) => {
    const d = /* @__PURE__ */ new Date();
    d.setDate(d.getDate() + dayOffset);
    d.setHours(h2, m, 0, 0);
    return d.toISOString();
  };
  var HH = (n) => String(n).padStart(2, "0");
  var hhmm = (h2, m) => `${HH(h2)}:${HH(m)}`;
  var dayLabel = (n) => {
    if (n === 0) return "Today";
    if (n === 1) return "Tomorrow";
    return (/* @__PURE__ */ new Date(D(n) + "T00:00:00")).toLocaleDateString("en-GB", { weekday: "short" });
  };
  var DEFAULT = {
    work: {
      categories: [
        { id: "clients", name: "Clients" },
        { id: "internal", name: "Internal" },
        { id: "finance", name: "Finance" },
        { id: "bizdev", name: "Business dev" }
      ],
      items: [
        // ── Clients ─────────────────────────────────────────────────────────────
        // Workflow: contract renewal with a send/waiting chain (chase is due)
        {
          id: "demo-wf1",
          type: "workflow",
          title: "Apex Partners \u2014 contract renewal",
          categoryId: "clients",
          hasDueDate: true,
          dueDate: D(14),
          notes: "Key account \u2014 handle personally. Target for a 3-year term.",
          done: false,
          tasks: [
            {
              id: "demo-wf1-t1",
              title: "Review existing contract terms",
              nature: "todo",
              status: "done",
              timeNeeded: 45
            },
            {
              id: "demo-wf1-t2",
              title: "Send renewal proposal",
              nature: "send",
              status: "done",
              isChase: false
            },
            {
              // Chase is overdue → shows in "Chase due" dashboard counter
              id: "demo-wf1-t3",
              title: "Awaiting approval \u2014 Apex Partners",
              nature: "waiting",
              status: "active",
              waitingSince: D(-5),
              waitingFrom: "Sarah Chen, Apex Partners",
              targetReturnDate: D(7),
              chaseDate: D(-1)
            },
            {
              id: "demo-wf1-t4",
              title: "Prepare final contract for signing",
              nature: "todo",
              status: "active",
              timeNeeded: 60,
              dueDate: D(9)
            },
            {
              id: "demo-wf1-t5",
              title: "Send signed contract to Apex",
              nature: "send",
              status: "active",
              isChase: false
            }
          ]
        },
        // Workflow: NDA in progress — awaiting reply, chase not yet due
        {
          id: "demo-wf2",
          type: "workflow",
          title: "Willow Tech \u2014 NDA & initial scoping",
          categoryId: "clients",
          hasDueDate: true,
          dueDate: D(21),
          notes: "Warm intro via James. Potential 6-figure engagement.",
          done: false,
          tasks: [
            {
              id: "demo-wf2-t1",
              title: "Send NDA for countersignature",
              nature: "send",
              status: "done",
              isChase: false
            },
            {
              // Chase not yet due → shows in "Awaiting reply" dashboard counter
              id: "demo-wf2-t2",
              title: "Awaiting signed NDA \u2014 Willow Tech",
              nature: "waiting",
              status: "active",
              waitingSince: D(-2),
              waitingFrom: "Marcus Webb, Willow Tech",
              targetReturnDate: D(5),
              chaseDate: D(4)
            },
            {
              id: "demo-wf2-t3",
              title: "Schedule discovery call",
              nature: "todo",
              status: "active",
              timeNeeded: 20
            },
            {
              id: "demo-wf2-t4",
              title: "Send scoping questionnaire",
              nature: "send",
              status: "active",
              isChase: false
            }
          ]
        },
        // Task: due today, focus block booked, checklist
        {
          id: "demo-t1",
          type: "task",
          title: "Draft response to Meridian pricing query",
          categoryId: "clients",
          dueDate: D(0),
          timeNeeded: 45,
          notes: "They are comparing us against two others. Emphasise onboarding support.",
          done: false,
          checklist: [
            { id: "demo-t1-c1", title: "Pull previous pricing correspondence", done: true },
            { id: "demo-t1-c2", title: "Confirm current rate card with finance", done: false },
            { id: "demo-t1-c3", title: "Draft and send reply", done: false }
          ],
          focusSessions: [{
            day: dayLabel(0),
            date: D(0),
            start: hhmm(14, 0),
            end: hhmm(14, 45),
            startISO: T(0, 14, 0),
            endISO: T(0, 14, 45)
          }]
        },
        // Task: completed (shows in Completed count)
        {
          id: "demo-t2",
          type: "task",
          title: "Send Meridian onboarding pack",
          categoryId: "clients",
          dueDate: D(-1),
          timeNeeded: 20,
          notes: "",
          done: true,
          doneAt: "09:15"
        },
        // ── Internal ─────────────────────────────────────────────────────────────
        // Task: big time commitment, focus block booked tomorrow
        {
          id: "demo-t3",
          type: "task",
          title: "Prepare Q2 board presentation",
          categoryId: "internal",
          dueDate: D(3),
          timeNeeded: 180,
          notes: "Focus on pipeline conversion and headcount plan. Keep slides under 12.",
          done: false,
          checklist: [
            { id: "demo-t3-c1", title: "Pull Q2 pipeline data from CRM", done: true },
            { id: "demo-t3-c2", title: "Draft key metrics slide", done: true },
            { id: "demo-t3-c3", title: "Add headcount and cost projections", done: false },
            { id: "demo-t3-c4", title: "Review deck with CFO", done: false },
            { id: "demo-t3-c5", title: "Send to board members 24h in advance", done: false }
          ],
          focusSessions: [{
            day: dayLabel(1),
            date: D(1),
            start: hhmm(9, 0),
            end: hhmm(11, 30),
            startISO: T(1, 9, 0),
            endISO: T(1, 11, 30)
          }]
        },
        // Workflow: quarterly planning cycle
        {
          id: "demo-wf3",
          type: "workflow",
          title: "Q3 planning cycle",
          categoryId: "internal",
          hasDueDate: true,
          dueDate: D(30),
          notes: "Get buy-in from each team lead before the all-hands.",
          done: false,
          tasks: [
            {
              id: "demo-wf3-t1",
              title: "Gather headcount forecasts from team leads",
              nature: "todo",
              status: "active",
              timeNeeded: 30,
              dueDate: D(7),
              checklist: [
                { id: "demo-wf3-t1-c1", title: "Sales team", done: false },
                { id: "demo-wf3-t1-c2", title: "Engineering team", done: false },
                { id: "demo-wf3-t1-c3", title: "Operations team", done: false }
              ]
            },
            {
              id: "demo-wf3-t2",
              title: "Draft budget proposal",
              nature: "todo",
              status: "active",
              timeNeeded: 120,
              dueDate: D(14)
            },
            {
              id: "demo-wf3-t3",
              title: "Circulate draft to leadership for comment",
              nature: "send",
              status: "active",
              isChase: false
            }
          ]
        },
        // ── Finance ──────────────────────────────────────────────────────────────
        {
          id: "demo-t4",
          type: "task",
          title: "Review monthly management accounts",
          categoryId: "finance",
          dueDate: D(2),
          timeNeeded: 90,
          notes: "Flag any variance above 10% for the board pack. Check payroll line carefully.",
          done: false
        },
        {
          id: "demo-t5",
          type: "task",
          title: "Submit Q1 expense claims",
          categoryId: "finance",
          dueDate: D(5),
          timeNeeded: 20,
          notes: "",
          done: false,
          checklist: [
            { id: "demo-t5-c1", title: "Gather all receipts", done: true },
            { id: "demo-t5-c2", title: "Complete expense report", done: false },
            { id: "demo-t5-c3", title: "Get line manager approval", done: false },
            { id: "demo-t5-c4", title: "Submit via finance portal", done: false }
          ]
        },
        // ── Business dev ─────────────────────────────────────────────────────────
        {
          id: "demo-t6",
          type: "task",
          title: "Respond to inbound partnership enquiry",
          categoryId: "bizdev",
          dueDate: D(1),
          timeNeeded: 45,
          notes: "Came via website form. Looks like a strong fit for the enterprise tier \u2014 escalate if interested.",
          done: false
        },
        // Workflow: tender submission
        {
          id: "demo-wf4",
          type: "workflow",
          title: "Brightside Group \u2014 tender response",
          categoryId: "bizdev",
          hasDueDate: true,
          dueDate: D(20),
          notes: "High value \u2014 worth investing proper time. Loop in pre-sales support.",
          done: false,
          tasks: [
            {
              id: "demo-wf4-t1",
              title: "Review tender documents thoroughly",
              nature: "todo",
              status: "active",
              timeNeeded: 120,
              dueDate: D(5)
            },
            {
              id: "demo-wf4-t2",
              title: "Draft tender response",
              nature: "todo",
              status: "active",
              timeNeeded: 240,
              dueDate: D(14)
            },
            {
              id: "demo-wf4-t3",
              title: "Submit tender response",
              nature: "send",
              status: "active",
              isChase: false
            }
          ]
        }
      ]
    },
    life: {
      categories: [
        { id: "home", name: "Home" },
        { id: "health", name: "Health" },
        { id: "personal", name: "Personal" }
      ],
      items: [
        {
          id: "demo-l1",
          type: "task",
          title: "Book annual boiler service",
          categoryId: "home",
          dueDate: D(14),
          timeNeeded: 15,
          notes: "",
          done: false,
          checklist: [
            { id: "demo-l1-c1", title: "Find last service certificate", done: false },
            { id: "demo-l1-c2", title: "Call to book appointment", done: false }
          ]
        },
        {
          id: "demo-l2",
          type: "task",
          title: "Sort contents insurance renewal",
          categoryId: "home",
          dueDate: D(6),
          timeNeeded: 30,
          notes: "Policy expires end of month. Check comparison sites before renewing direct.",
          done: false
        },
        {
          id: "demo-l3",
          type: "task",
          title: "Book GP annual check-up",
          categoryId: "health",
          dueDate: D(21),
          timeNeeded: 15,
          notes: "",
          done: false
        },
        {
          id: "demo-l4",
          type: "task",
          title: "Renew gym membership",
          categoryId: "health",
          dueDate: D(7),
          timeNeeded: 10,
          notes: "",
          done: false
        },
        {
          id: "demo-l5",
          type: "task",
          title: "File self-assessment tax return",
          categoryId: "personal",
          dueDate: D(30),
          timeNeeded: 120,
          notes: "Remember the interest income from the savings account this year.",
          done: false,
          checklist: [
            { id: "demo-l5-c1", title: "Gather P60 and bank statements", done: false },
            { id: "demo-l5-c2", title: "Log in to HMRC portal", done: false },
            { id: "demo-l5-c3", title: "Complete and submit return", done: false },
            { id: "demo-l5-c4", title: "Make payment if owed", done: false }
          ]
        }
      ]
    }
  };

  // src/js/utils.js
  function computeChaseDate(targetReturnDate, followUpDays) {
    if (!followUpDays) return "";
    const today = /* @__PURE__ */ new Date();
    today.setHours(0, 0, 0, 0);
    const chase = new Date(today);
    chase.setDate(chase.getDate() + followUpDays);
    if (targetReturnDate) {
      const ret = new Date(targetReturnDate);
      ret.setHours(0, 0, 0, 0);
      if (chase >= ret) return "";
    }
    return chase.toISOString().split("T")[0];
  }
  function daysBefore(dateStr) {
    if (!dateStr) return null;
    const now = /* @__PURE__ */ new Date();
    now.setHours(0, 0, 0, 0);
    const d = new Date(dateStr);
    d.setHours(0, 0, 0, 0);
    return Math.floor((now - d) / 864e5);
  }
  function formatDate(dateStr) {
    if (!dateStr) return "\u2014";
    return new Date(dateStr).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  }
  function formatDue(dateStr) {
    if (!dateStr) return "";
    const days = daysBefore(dateStr);
    const dt = new Date(dateStr).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
    if (days === 0) return "Due today";
    if (days > 0) return `Overdue \u2014 ${dt}`;
    return `Due ${dt}`;
  }
  function isOverdue(dateStr) {
    return daysBefore(dateStr) > 0;
  }
  function formatTime(minutes) {
    if (!minutes) return "";
    if (minutes >= 60) {
      const h2 = Math.floor(minutes / 60);
      const m = minutes % 60;
      return m ? `${h2}h ${m}m` : `${h2}h`;
    }
    return `${minutes}m`;
  }
  var PRIORITY_COLORS = [
    "#1D9E75",
    // 1 – green
    "#4CAF6A",
    // 2
    "#7BBF44",
    // 3
    "#AAC928",
    // 4
    "#CEC212",
    // 5 – yellow
    "#F0A500",
    // 6 – amber
    "#E07820",
    // 7 – orange
    "#D04A10",
    // 8
    "#C02808",
    // 9
    "#A32D2D"
    // 10 – red
  ];
  function getPriorityColor(p) {
    return PRIORITY_COLORS[Math.max(0, Math.min(9, (p || 1) - 1))];
  }
  function normalizePriority(p) {
    if (typeof p === "number") return Math.max(1, Math.min(10, Math.round(p)));
    if (p === "urgent") return 8;
    if (p === "medium") return 5;
    if (p === "low") return 2;
    return 5;
  }
  function computePriority(item) {
    if (!item.dueDate || !item.timeNeeded) return normalizePriority(item.priority);
    const deadline = new Date(item.dueDate);
    deadline.setHours(17, 0, 0, 0);
    const hoursRemaining = (deadline - /* @__PURE__ */ new Date()) / 36e5;
    if (hoursRemaining <= 0) return 10;
    const ratio = item.timeNeeded / 60 / hoursRemaining;
    return Math.max(1, Math.min(10, Math.round(ratio * 10)));
  }
  function isPriorityAuto(item) {
    return !!(item.dueDate && item.timeNeeded);
  }
  function computeWfTaskPriority(task) {
    if (task.nature === "action") return computePriority(task);
    if (task.nature === "waiting") {
      if (task.chaseDate) {
        const daysUntilChase = -daysBefore(task.chaseDate);
        if (daysUntilChase <= 0) return 10;
        return Math.max(1, Math.min(9, 10 - Math.round(daysUntilChase)));
      }
      const daysOut = task.waitingSince ? daysBefore(task.waitingSince) : 0;
      const threshold = task.followUpDays || 5;
      return Math.max(1, Math.min(10, Math.round(daysOut / threshold * 10)));
    }
    return null;
  }
  function computeWorkflowPriority(workflow) {
    const active = (workflow.tasks || []).filter((t) => t.status === "active");
    let best = 0;
    for (const task of active) {
      const p = computeWfTaskPriority(task);
      if (p !== null && p > best) {
        best = p;
        if (best === 10) break;
      }
    }
    return best > 0 ? best : null;
  }
  var COMPETITION_CEIL = 7;
  var _competitionMap = {};
  function setCompetitionMap(map) {
    _competitionMap = map;
  }
  function isCompetitionPriority(itemId) {
    return _competitionMap[itemId] !== void 0;
  }
  function getEffectivePriority(item) {
    const comp = _competitionMap[item.id];
    if (comp !== void 0) return comp;
    return item.type === "workflow" ? computeWorkflowPriority(item) : computePriority(item);
  }
  function getCalPressure(item, freeMinutes) {
    if (!freeMinutes || freeMinutes < 30 || !item.timeNeeded) return 0;
    return item.timeNeeded / freeMinutes;
  }
  function computeCompetitionMap(items, freeMinutes = null) {
    const active = items.filter((i) => !i.done);
    if (!active.length) return {};
    const scored = active.flatMap((item) => {
      const p = item.type === "workflow" ? computeWorkflowPriority(item) : computePriority(item);
      if (p === null) return [];
      const calBoost = Math.min(4, Math.round(getCalPressure(item, freeMinutes) * 4));
      return [{ id: item.id, p: Math.min(10, p + calBoost) }];
    });
    if (!scored.length) return {};
    const maxP = Math.max(...scored.map((s) => s.p));
    if (maxP >= 5) return {};
    const minP = Math.min(...scored.map((s) => s.p));
    const spread = maxP - minP;
    return Object.fromEntries(scored.map(({ id, p }) => [
      id,
      spread === 0 ? 3 : Math.max(1, Math.round(1 + (p - minP) / spread * (COMPETITION_CEIL - 1)))
    ]));
  }
  function uid() {
    return "id-" + Date.now() + "-" + Math.random().toString(36).slice(2, 7);
  }

  // src/js/services/calendar.js
  var CAL_KEY = "focusboard_calendar";
  function load() {
    try {
      return JSON.parse(localStorage.getItem(CAL_KEY) || "{}");
    } catch {
      return {};
    }
  }
  function save(s) {
    try {
      localStorage.setItem(CAL_KEY, JSON.stringify(s));
    } catch {
    }
  }
  var state = load();
  function isGoogleConnected() {
    return !!(state.google?.accessToken || state.google?.refreshToken);
  }
  function isOutlookConnected() {
    return !!state.outlook?.clientId;
  }
  function isAnyConnected() {
    return isGoogleConnected() || isOutlookConnected();
  }
  function loadScript(src) {
    return new Promise((resolve, reject) => {
      if (document.querySelector(`script[src="${src}"]`)) return resolve();
      const s = document.createElement("script");
      s.src = src;
      s.async = true;
      s.onload = resolve;
      s.onerror = () => reject(new Error(`Failed to load ${src}`));
      document.head.appendChild(s);
    });
  }
  function randomBase64url(bytes = 48) {
    const arr = new Uint8Array(bytes);
    crypto.getRandomValues(arr);
    return btoa(String.fromCharCode(...arr)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
  }
  async function sha256Base64url(str) {
    const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(str));
    return btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
  }
  var GOOGLE_CAL_BASE = "https://www.googleapis.com/calendar/v3";
  var GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
  var GOOGLE_CAL_SCOPE = "https://www.googleapis.com/auth/calendar";
  async function connectGoogle(clientId, clientSecret) {
    const verifier = randomBase64url(48);
    const challenge = await sha256Base64url(verifier);
    const stateParam = randomBase64url(16);
    const redirectUri = location.origin;
    const authUrl = "https://accounts.google.com/o/oauth2/v2/auth?" + new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: "code",
      scope: GOOGLE_CAL_SCOPE,
      code_challenge: challenge,
      code_challenge_method: "S256",
      access_type: "offline",
      prompt: "consent",
      state: stateParam
    });
    const popup = window.open(authUrl, "_blank", "width=520,height=640,left=300,top=100");
    if (!popup) throw new Error("Popup was blocked \u2014 please allow popups for this site and try again.");
    const code = await new Promise((resolve, reject) => {
      const timer = setInterval(() => {
        try {
          if (popup.closed) {
            clearInterval(timer);
            reject(new Error("Sign-in window was closed \u2014 please try again."));
            return;
          }
          const url = new URL(popup.location.href);
          if (url.origin !== location.origin) return;
          clearInterval(timer);
          popup.close();
          const err = url.searchParams.get("error");
          if (err) return reject(new Error(err === "access_denied" ? "Access was denied." : err));
          const returnedState = url.searchParams.get("state");
          if (returnedState !== stateParam) return reject(new Error("State mismatch \u2014 please try again."));
          const c = url.searchParams.get("code");
          if (!c) return reject(new Error("No authorisation code received."));
          resolve(c);
        } catch {
        }
      }, 250);
      setTimeout(() => {
        clearInterval(timer);
        if (!popup.closed) popup.close();
        reject(new Error("Sign-in timed out."));
      }, 5 * 6e4);
    });
    const resp = await fetch(GOOGLE_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        ...clientSecret ? { client_secret: clientSecret } : {},
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
        code_verifier: verifier
      })
    });
    if (!resp.ok) {
      const err = await resp.json().catch(() => ({}));
      throw new Error(err.error_description || err.error || `Token exchange failed (${resp.status})`);
    }
    const tokens = await resp.json();
    state.google = {
      clientId,
      clientSecret: clientSecret || null,
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiresAt: Date.now() + (tokens.expires_in - 60) * 1e3
    };
    save(state);
  }
  function disconnectGoogle() {
    if (state.google?.accessToken) {
      fetch(`https://oauth2.googleapis.com/revoke?token=${state.google.accessToken}`, { method: "POST" }).catch(() => {
      });
    }
    delete state.google;
    save(state);
  }
  async function getGoogleToken() {
    if (!state.google) return null;
    if (Date.now() < state.google.expiresAt) return state.google.accessToken;
    if (!state.google.refreshToken) throw new Error("Google Calendar session expired \u2014 please reconnect.");
    const resp = await fetch(GOOGLE_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: state.google.clientId,
        ...state.google.clientSecret ? { client_secret: state.google.clientSecret } : {},
        grant_type: "refresh_token",
        refresh_token: state.google.refreshToken
      })
    });
    if (!resp.ok) throw new Error("Google token refresh failed \u2014 please reconnect.");
    const tokens = await resp.json();
    state.google.accessToken = tokens.access_token;
    state.google.expiresAt = Date.now() + (tokens.expires_in - 60) * 1e3;
    save(state);
    return state.google.accessToken;
  }
  async function googleFetch(path, options = {}) {
    const token = await getGoogleToken();
    if (!token) throw new Error("Google Calendar not connected");
    const resp = await fetch(`${GOOGLE_CAL_BASE}${path}`, {
      ...options,
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", ...options.headers || {} }
    });
    if (!resp.ok) throw new Error(`Google API error: ${resp.status}`);
    return resp.json();
  }
  async function getGoogleEvents(startISO, endISO) {
    const params = new URLSearchParams({
      timeMin: startISO,
      timeMax: endISO,
      singleEvents: "true",
      orderBy: "startTime",
      maxResults: "100"
    });
    const data = await googleFetch(`/calendars/primary/events?${params}`);
    return normaliseEvents(data.items || [], "google");
  }
  async function createGoogleEvent(title, body, startISO, endISO) {
    return googleFetch("/calendars/primary/events", {
      method: "POST",
      body: JSON.stringify({
        summary: `\u{1F3AF} ${title}`,
        description: body,
        start: { dateTime: startISO, timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone },
        end: { dateTime: endISO, timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone },
        colorId: "7"
      })
    });
  }
  var MS_GRAPH = "https://graph.microsoft.com/v1.0";
  var MS_SCOPES = ["Calendars.ReadWrite"];
  var _msalInstance = null;
  async function getMsal(clientId) {
    await loadScript("https://alcdn.msauth.net/browser/2.38.3/js/msal-browser.min.js");
    if (!_msalInstance || _msalInstance.config.auth.clientId !== clientId) {
      _msalInstance = new window.msal.PublicClientApplication({
        auth: { clientId, redirectUri: location.origin },
        cache: { cacheLocation: "localStorage" }
      });
      await _msalInstance.initialize();
    }
    return _msalInstance;
  }
  async function connectOutlook(clientId) {
    const msal = await getMsal(clientId);
    const result = await msal.loginPopup({ scopes: MS_SCOPES });
    state.outlook = { clientId, homeAccountId: result.account.homeAccountId };
    save(state);
  }
  function disconnectOutlook() {
    delete state.outlook;
    save(state);
    _msalInstance = null;
  }
  async function getOutlookToken() {
    if (!state.outlook) return null;
    const msal = await getMsal(state.outlook.clientId);
    const accounts = msal.getAllAccounts();
    const account = accounts.find((a) => a.homeAccountId === state.outlook.homeAccountId) || accounts[0];
    if (!account) throw new Error("Outlook account not found \u2014 please reconnect.");
    const result = await msal.acquireTokenSilent({ scopes: MS_SCOPES, account });
    return result.accessToken;
  }
  async function outlookFetch(path, options = {}) {
    const token = await getOutlookToken();
    const resp = await fetch(`${MS_GRAPH}${path}`, {
      ...options,
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", ...options.headers || {} }
    });
    if (!resp.ok) throw new Error(`Graph API error: ${resp.status}`);
    return resp.json();
  }
  async function getOutlookEvents(startISO, endISO) {
    const params = new URLSearchParams({
      startDateTime: startISO,
      endDateTime: endISO,
      $select: "subject,start,end,isAllDay",
      $orderby: "start/dateTime",
      $top: "100"
    });
    const data = await outlookFetch(`/me/calendarView?${params}`);
    return normaliseEvents(data.value || [], "outlook");
  }
  async function createOutlookEvent(title, body, startISO, endISO) {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return outlookFetch("/me/events", {
      method: "POST",
      body: JSON.stringify({
        subject: `\u{1F3AF} ${title}`,
        body: { contentType: "text", content: body },
        start: { dateTime: startISO.replace("Z", ""), timeZone: tz },
        end: { dateTime: endISO.replace("Z", ""), timeZone: tz },
        categories: ["Focusboard"]
      })
    });
  }
  function normaliseEvents(items, provider) {
    return items.filter((e) => provider === "google" ? !!e.start?.dateTime : !e.isAllDay).map((e) => ({
      id: e.id,
      title: provider === "google" ? e.summary : e.subject,
      start: new Date(provider === "google" ? e.start.dateTime : e.start.dateTime).getTime(),
      end: new Date(provider === "google" ? e.end.dateTime : e.end.dateTime).getTime()
    }));
  }
  async function getEvents(dateStr) {
    const start = (/* @__PURE__ */ new Date(`${dateStr}T00:00:00`)).toISOString();
    const end = (/* @__PURE__ */ new Date(`${dateStr}T23:59:59`)).toISOString();
    if (isGoogleConnected()) return getGoogleEvents(start, end);
    if (isOutlookConnected()) return getOutlookEvents(start, end);
    return [];
  }
  async function bookFocusBlock(task, startISO, endISO) {
    const notes = [
      `Priority: ${task.priority || "\u2014"}`,
      `Due: ${task.dueDate || "\u2014"}`,
      `Time needed: ${task.timeNeeded ? Math.round(task.timeNeeded) + " mins" : "\u2014"}`,
      task.notes ? `
Notes: ${task.notes}` : ""
    ].filter(Boolean).join("\n");
    if (isGoogleConnected()) return createGoogleEvent(task.title, notes, startISO, endISO);
    if (isOutlookConnected()) return createOutlookEvent(task.title, notes, startISO, endISO);
    throw new Error("No calendar connected");
  }
  async function getGoogleBusyPeriods(startISO, endISO) {
    let calIds = ["primary"];
    try {
      const calList = await googleFetch("/users/me/calendarList?minAccessRole=reader");
      if (calList.items?.length) calIds = calList.items.map((c) => c.id);
    } catch {
    }
    const results = await Promise.all(calIds.map(async (calId) => {
      try {
        const params = new URLSearchParams({
          timeMin: startISO,
          timeMax: endISO,
          singleEvents: "true",
          maxResults: "100"
        });
        const data = await googleFetch(`/calendars/${encodeURIComponent(calId)}/events?${params}`);
        return (data.items || []).filter((e) => !!e.start?.dateTime).map((e) => ({
          start: new Date(e.start.dateTime).getTime(),
          end: new Date(e.end.dateTime).getTime()
        }));
      } catch {
        return [];
      }
    }));
    return results.flat();
  }
  async function getOutlookBusyPeriods(startISO, endISO) {
    const events = await getOutlookEvents(startISO, endISO);
    return events.map((e) => ({ start: e.start, end: e.end }));
  }
  async function getTotalFreeMinutes(dateStr, workStart = "09:30", workEnd = "17:30", bufferMins = 15) {
    const startISO = (/* @__PURE__ */ new Date(`${dateStr}T00:00:00`)).toISOString();
    const endISO = (/* @__PURE__ */ new Date(`${dateStr}T23:59:59`)).toISOString();
    let rawBusy = [];
    if (isGoogleConnected()) rawBusy = await getGoogleBusyPeriods(startISO, endISO);
    else if (isOutlookConnected()) rawBusy = await getOutlookBusyPeriods(startISO, endISO);
    const wsMs = parseLocalTime(dateStr, workStart);
    const weMs = parseLocalTime(dateStr, workEnd);
    const bufMs = bufferMins * 6e4;
    const busy = rawBusy.map((b) => ({ start: b.start - bufMs, end: b.end + bufMs })).sort((a, b) => a.start - b.start);
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
      const bEnd = Math.min(block.end, weMs);
      if (bStart > cursor) freeMs += bStart - cursor;
      if (bEnd > cursor) cursor = bEnd;
    }
    if (weMs > cursor) freeMs += weMs - cursor;
    return Math.round(freeMs / 6e4);
  }
  async function getFreeSlots(dateStr, durationMins, workStart = "09:30", workEnd = "17:30", bufferMins = 15) {
    const startISO = (/* @__PURE__ */ new Date(`${dateStr}T00:00:00`)).toISOString();
    const endISO = (/* @__PURE__ */ new Date(`${dateStr}T23:59:59`)).toISOString();
    let rawBusy = [];
    if (isGoogleConnected()) rawBusy = await getGoogleBusyPeriods(startISO, endISO);
    else if (isOutlookConnected()) rawBusy = await getOutlookBusyPeriods(startISO, endISO);
    const wsMs = parseLocalTime(dateStr, workStart);
    const weMs = parseLocalTime(dateStr, workEnd);
    const durMs = durationMins * 6e4;
    const bufMs = bufferMins * 6e4;
    const busy = rawBusy.map((b) => ({ start: b.start - bufMs, end: b.end + bufMs })).sort((a, b) => a.start - b.start);
    const merged = [];
    for (const b of busy) {
      if (merged.length && b.start <= merged[merged.length - 1].end) {
        merged[merged.length - 1].end = Math.max(merged[merged.length - 1].end, b.end);
      } else {
        merged.push({ ...b });
      }
    }
    const slots = [];
    let cursor = wsMs;
    for (const block of merged) {
      if (block.start > cursor && block.start - cursor >= durMs) {
        collectSlots(slots, cursor, block.start, durMs);
      }
      cursor = Math.max(cursor, block.end);
    }
    if (weMs - cursor >= durMs) collectSlots(slots, cursor, weMs, durMs);
    return slots;
  }
  function parseLocalTime(dateStr, hhmm2) {
    return (/* @__PURE__ */ new Date(`${dateStr}T${hhmm2}:00`)).getTime();
  }
  function collectSlots(slots, from, to, durMs) {
    const step = 15 * 6e4;
    let t = Math.ceil(from / step) * step;
    while (t + durMs <= to) {
      const s = new Date(t);
      const e = new Date(t + durMs);
      slots.push({
        startMs: t,
        endMs: t + durMs,
        startISO: s.toISOString(),
        endISO: e.toISOString(),
        label: `${fmt(s)} \u2013 ${fmt(e)}`
      });
      t += step;
    }
  }
  function fmt(d) {
    return d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
  }

  // src/js/store.js
  function loadData() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : DEFAULT;
    } catch {
      return DEFAULT;
    }
  }
  function saveData(data) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch {
    }
  }
  function loadSettings() {
    try {
      const raw = localStorage.getItem(SETTINGS_KEY);
      return raw ? JSON.parse(raw) : { theme: "light", useSystemTheme: false, sidebarCollapsed: false, workStart: "09:30", workEnd: "17:30", focusBuffer: 15, focusMinBlock: 30, followUpDays: 5 };
    } catch {
      return { theme: "light", useSystemTheme: false, sidebarCollapsed: false, workStart: "09:30", workEnd: "17:30", focusBuffer: 15, focusMinBlock: 30, followUpDays: 5 };
    }
  }
  function saveSettings(settings) {
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    } catch {
    }
  }
  function persistSettings() {
    saveSettings({ theme: S.theme, useSystemTheme: S.useSystemTheme, sidebarCollapsed: S.sidebarCollapsed, workStart: S.workStart, workEnd: S.workEnd, focusBuffer: S.focusBuffer, focusMinBlock: S.focusMinBlock, followUpDays: S.followUpDays });
  }
  function updateFocusDefaults(buffer, minBlock) {
    S.focusBuffer = buffer;
    S.focusMinBlock = minBlock;
    persistSettings();
  }
  function updateFollowUpDays(days) {
    S.followUpDays = days;
    persistSettings();
  }
  var renderFn = () => {
  };
  function setRenderFn(fn) {
    renderFn = fn;
  }
  var savedSettings = loadSettings();
  var systemMediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
  function applySystemTheme() {
    const theme = systemMediaQuery.matches ? "dark" : "light";
    S.theme = theme;
    document.body.className = theme;
    renderFn();
  }
  var S = {
    data: loadData(),
    panel: "work",
    view: "dashboard",
    activeCat: null,
    filter: "all",
    showAddItem: false,
    showAddCat: false,
    showSettings: false,
    expandedCards: {},
    moreOpenCards: {},
    editingCards: {},
    editingCat: null,
    stageInputCards: {},
    addItemForm: { type: "task", nature: "action", title: "", categoryId: "", priority: 5, dueDate: "", timeNeeded: 60, notes: "", hasDueDate: false, waitingFrom: "", targetReturnDate: "", chaseDate: "", recurrence: "" },
    searchQuery: "",
    completedOpen: false,
    workloadPeriod: "week",
    workStart: savedSettings.workStart || "09:30",
    workEnd: savedSettings.workEnd || "17:30",
    theme: savedSettings.useSystemTheme ? systemMediaQuery.matches ? "dark" : "light" : savedSettings.theme || "light",
    useSystemTheme: savedSettings.useSystemTheme || false,
    sidebarCollapsed: savedSettings.sidebarCollapsed || false,
    dragId: null,
    calWeekStart: null,
    dashFilter: null,
    // 'overdue' | 'dueToday' | 'upcoming' | 'chaseDue' | 'awaitingReply' | 'completed' | null
    dashTab: "all",
    // 'all' | 'today' | 'week'
    focusBuffer: savedSettings.focusBuffer ?? 15,
    focusMinBlock: savedSettings.focusMinBlock ?? 30,
    followUpDays: savedSettings.followUpDays ?? 5,
    calFreeMinutes: null
    // total free working-hour minutes today (null = not loaded / no calendar)
  };
  if (S.useSystemTheme) systemMediaQuery.addEventListener("change", applySystemTheme);
  async function loadCalFreeMinutes() {
    if (!isAnyConnected()) {
      if (S.calFreeMinutes !== null) {
        S.calFreeMinutes = null;
        renderFn();
      }
      return;
    }
    const d = /* @__PURE__ */ new Date();
    const dateStr = [d.getFullYear(), String(d.getMonth() + 1).padStart(2, "0"), String(d.getDate()).padStart(2, "0")].join("-");
    try {
      S.calFreeMinutes = await getTotalFreeMinutes(dateStr, S.workStart, S.workEnd);
      renderFn();
    } catch {
      S.calFreeMinutes = null;
    }
  }
  function set(patch) {
    Object.assign(S, patch);
    renderFn();
  }
  function upd(newData) {
    S.data = newData;
    saveData(newData);
    renderFn();
  }
  function getPanelData() {
    return S.data[S.panel];
  }
  function getPanelColor() {
    return S.panel === "work" ? "#378ADD" : "#1D9E75";
  }
  function getActiveCatName() {
    const p = getPanelData();
    if (!p || !S.activeCat) return "";
    return p.categories.find((c) => c.id === S.activeCat)?.name || "";
  }
  function getFilteredItems() {
    const p = getPanelData();
    if (!p) return [];
    let items = S.view === "category" && S.activeCat ? p.items.filter((i) => i.categoryId === S.activeCat) : p.items;
    if (S.filter === "tasks") items = items.filter((i) => i.type === "task");
    else if (S.filter === "workflows") items = items.filter((i) => i.type === "workflow");
    else if (S.filter === "awaiting") items = items.filter((i) => i.stage === "awaiting");
    else if (S.filter === "unscheduled") items = items.filter((i) => !i.focusBlock && !i.done);
    return items;
  }
  function switchPanel(panel) {
    set({ panel, view: "dashboard", activeCat: null, filter: "all", showAddItem: false, showAddCat: false, dashFilter: null, dashTab: "all" });
  }
  function gotoCategory(id) {
    set({ view: "category", activeCat: id, filter: "all", showAddItem: false, showAddCat: false, dashFilter: null });
  }
  function gotoDashboard() {
    set({ view: "dashboard", activeCat: null, filter: "all", showAddItem: false, showAddCat: false, dashFilter: null, dashTab: "all" });
  }
  function gotoWorkload() {
    set({ view: "workload", activeCat: null, showAddItem: false, showAddCat: false, dashFilter: null });
  }
  function toggleTheme() {
    const theme = S.theme === "light" ? "dark" : "light";
    S.theme = theme;
    document.body.className = theme;
    persistSettings();
    renderFn();
  }
  function toggleSystemTheme() {
    S.useSystemTheme = !S.useSystemTheme;
    if (S.useSystemTheme) {
      systemMediaQuery.addEventListener("change", applySystemTheme);
      applySystemTheme();
    } else {
      systemMediaQuery.removeEventListener("change", applySystemTheme);
    }
    persistSettings();
    renderFn();
  }
  function updateWorkingHours(start, end) {
    S.workStart = start;
    S.workEnd = end;
    persistSettings();
    loadCalFreeMinutes();
  }
  function toggleSidebar() {
    S.sidebarCollapsed = !S.sidebarCollapsed;
    persistSettings();
    renderFn();
  }
  function toggleCard(id) {
    const ec = { ...S.expandedCards };
    ec[id] = !ec[id];
    S.expandedCards = ec;
    const card = document.querySelector(`[data-id="${id}"]`);
    if (card) {
      card.classList.toggle("expanded", !!ec[id]);
      card.querySelector(".expand-btn")?.classList.toggle("open", !!ec[id]);
      card.querySelector(".expanded-body")?.classList.toggle("open", !!ec[id]);
    }
  }
  function toggleMore(id) {
    const mc = { ...S.moreOpenCards };
    mc[id] = !mc[id];
    set({ moreOpenCards: mc });
  }
  function startEdit(id) {
    const item = getPanelData().items.find((i) => i.id === id);
    if (!item) return;
    const ec = { ...S.editingCards };
    ec[id] = item.type === "workflow" ? { title: item.title, notes: item.notes || "" } : { title: item.title, priority: item.priority, dueDate: item.dueDate || "", timeNeeded: item.timeNeeded || 60, notes: item.notes || "", recurrence: item.recurrence || "" };
    const exp = { ...S.expandedCards };
    exp[id] = true;
    set({ editingCards: ec, expandedCards: exp });
  }
  function cancelEdit(id) {
    const ec = { ...S.editingCards };
    delete ec[id];
    set({ editingCards: ec });
  }
  function saveEdit(id) {
    const edits = S.editingCards[id];
    if (!edits) return;
    const newData = JSON.parse(JSON.stringify(S.data));
    const items = newData[S.panel].items;
    const idx = items.findIndex((i) => i.id === id);
    if (idx >= 0) Object.assign(items[idx], edits);
    const ec = { ...S.editingCards };
    delete ec[id];
    S.editingCards = ec;
    upd(newData);
  }
  function nextRecurringDueDate(dueDate, freq) {
    const base = dueDate ? new Date(dueDate) : /* @__PURE__ */ new Date();
    base.setHours(0, 0, 0, 0);
    const today = /* @__PURE__ */ new Date();
    today.setHours(0, 0, 0, 0);
    do {
      if (freq === "daily") base.setDate(base.getDate() + 1);
      if (freq === "weekly") base.setDate(base.getDate() + 7);
      if (freq === "monthly") base.setMonth(base.getMonth() + 1);
      if (freq === "yearly") base.setFullYear(base.getFullYear() + 1);
    } while (base <= today);
    return base.toISOString().split("T")[0];
  }
  function toggleDone(id) {
    const newData = JSON.parse(JSON.stringify(S.data));
    const items = newData[S.panel].items;
    const idx = items.findIndex((i) => i.id === id);
    if (idx >= 0) {
      items[idx].done = !items[idx].done;
      items[idx].doneAt = items[idx].done ? (/* @__PURE__ */ new Date()).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }) : void 0;
      items[idx].doneDate = items[idx].done ? TODAY : void 0;
      if (items[idx].done && items[idx].recurrence) {
        const next = JSON.parse(JSON.stringify(items[idx]));
        next.id = uid();
        next.done = false;
        next.doneAt = void 0;
        next.doneDate = void 0;
        next.dueDate = nextRecurringDueDate(items[idx].dueDate, items[idx].recurrence);
        next.focusSessions = [];
        items.push(next);
      }
    }
    upd(newData);
  }
  function addFocusSession(id, session) {
    const newData = JSON.parse(JSON.stringify(S.data));
    const items = newData[S.panel].items;
    const idx = items.findIndex((i) => i.id === id);
    if (idx < 0) return;
    const item = items[idx];
    if (!item.focusSessions) {
      item.focusSessions = item.focusBlock ? [item.focusBlock] : [];
      delete item.focusBlock;
    }
    item.focusSessions.push(session);
    upd(newData);
  }
  function removeFocusSession(id, idx) {
    const newData = JSON.parse(JSON.stringify(S.data));
    const items = newData[S.panel].items;
    const itemIdx = items.findIndex((i) => i.id === id);
    if (itemIdx < 0) return;
    const item = items[itemIdx];
    if (!item.focusSessions) return;
    item.focusSessions.splice(idx, 1);
    upd(newData);
  }
  function updateItem(id, changes) {
    const newData = JSON.parse(JSON.stringify(S.data));
    const items = newData[S.panel].items;
    const idx = items.findIndex((i) => i.id === id);
    if (idx >= 0) Object.assign(items[idx], changes);
    upd(newData);
  }
  function addItem(form) {
    const newData = JSON.parse(JSON.stringify(S.data));
    const isWorkflow = form.type === "workflow";
    const newId = uid();
    newData[S.panel].items.push({
      ...form,
      id: newId,
      done: false,
      // New workflow model
      tasks: isWorkflow ? [] : void 0,
      hasDueDate: isWorkflow ? form.hasDueDate || false : void 0,
      dueDate: isWorkflow ? form.hasDueDate ? form.dueDate : "" : form.dueDate,
      // Clear old workflow fields
      stages: void 0,
      stage: void 0,
      stageSentDate: void 0,
      followUpDays: void 0
    });
    const firstCatId = S.activeCat || getPanelData().categories[0]?.id || "";
    if (isWorkflow) S.expandedCards = { ...S.expandedCards, [newId]: true };
    set({ showAddItem: false, dashFilter: null, addItemForm: { type: "task", nature: "action", title: "", categoryId: firstCatId, priority: 5, dueDate: "", timeNeeded: 60, notes: "", hasDueDate: false, waitingFrom: "", targetReturnDate: "", chaseDate: "" } });
    upd(newData);
  }
  function convertItem(id) {
    const newData = JSON.parse(JSON.stringify(S.data));
    const items = newData[S.panel].items;
    const idx = items.findIndex((i) => i.id === id);
    if (idx < 0) return;
    const item = items[idx];
    if (item.type === "task") {
      item.type = "workflow";
      if (!item.tasks) item.tasks = [];
      item.hasDueDate = !!item.dueDate;
      delete item.stages;
      delete item.stage;
      delete item.stageSentDate;
      delete item.followUpDays;
      delete item.subtasks;
    } else {
      item.type = "task";
      delete item.tasks;
      delete item.hasDueDate;
    }
    upd(newData);
  }
  function deleteItem(id) {
    const newData = JSON.parse(JSON.stringify(S.data));
    const items = newData[S.panel].items;
    const idx = items.findIndex((i) => i.id === id);
    if (idx >= 0) items.splice(idx, 1);
    upd(newData);
  }
  function renameCategory(id, name) {
    const newData = JSON.parse(JSON.stringify(S.data));
    const cats = newData[S.panel].categories;
    const idx = cats.findIndex((c) => c.id === id);
    if (idx >= 0) cats[idx].name = name.trim();
    S.editingCat = null;
    upd(newData);
  }
  function deleteCategory(id) {
    const newData = JSON.parse(JSON.stringify(S.data));
    const panel = newData[S.panel];
    const idx = panel.categories.findIndex((c) => c.id === id);
    if (idx < 0) return;
    const remaining = panel.categories.filter((c) => c.id !== id);
    if (remaining.length > 0) {
      const fallbackId = remaining[0].id;
      panel.items.forEach((item) => {
        if (item.categoryId === id) item.categoryId = fallbackId;
      });
    } else {
      panel.items = panel.items.filter((i) => i.categoryId !== id);
    }
    panel.categories.splice(idx, 1);
    if (S.activeCat === id) {
      S.view = "dashboard";
      S.activeCat = null;
    }
    S.editingCat = null;
    upd(newData);
  }
  function addCategory(name) {
    const newData = JSON.parse(JSON.stringify(S.data));
    newData[S.panel].categories.push({
      id: name.toLowerCase().replace(/\s+/g, "-") + "-" + Date.now(),
      name
    });
    set({ showAddCat: false });
    upd(newData);
  }

  // src/js/dom.js
  function h(tag, attrs, ...children) {
    const el = document.createElement(tag);
    if (attrs) {
      for (const [key, value] of Object.entries(attrs)) {
        if (key === "class") {
          el.className = value;
        } else if (key === "style" && typeof value === "object") {
          for (const [prop, val] of Object.entries(value)) {
            if (prop.startsWith("--")) el.style.setProperty(prop, val);
            else el.style[prop] = val;
          }
        } else if (key.startsWith("on") && typeof value === "function") {
          el.addEventListener(key.slice(2).toLowerCase(), value);
        } else if (["checked", "value", "disabled", "selected"].includes(key)) {
          el[key] = value;
        } else {
          el.setAttribute(key, value);
        }
      }
    }
    for (const child of children) {
      if (child == null || child === false) continue;
      if (typeof child === "string" || typeof child === "number") {
        el.appendChild(document.createTextNode(String(child)));
      } else if (child instanceof Node) {
        el.appendChild(child);
      } else if (Array.isArray(child)) {
        child.forEach((x) => {
          if (x instanceof Node) el.appendChild(x);
          else if (x != null) el.appendChild(document.createTextNode(String(x)));
        });
      }
    }
    return el;
  }
  function expField(label, value, extraClass) {
    return h(
      "div",
      null,
      h("div", { class: "exp-label" }, label),
      h("div", { class: `exp-value${extraClass ? " " + extraClass : ""}` }, value)
    );
  }
  function createSvg(width, height, viewBox, innerHTML) {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("width", width);
    svg.setAttribute("height", height);
    svg.setAttribute("viewBox", viewBox);
    svg.setAttribute("fill", "none");
    svg.innerHTML = innerHTML;
    return svg;
  }
  function buildPriorityPicker(current, onChange) {
    const COLORS = [
      "#1D9E75",
      "#4CAF6A",
      "#7BBF44",
      "#AAC928",
      "#CEC212",
      "#F0A500",
      "#E07820",
      "#D04A10",
      "#C02808",
      "#A32D2D"
    ];
    const norm = (v) => {
      if (typeof v === "number") return Math.max(1, Math.min(10, Math.round(v)));
      if (v === "urgent") return 8;
      if (v === "medium") return 5;
      if (v === "low") return 2;
      return 5;
    };
    let selected = norm(current);
    const wrap = h("div", { class: "priority-picker" });
    const btns = [];
    const refresh = () => btns.forEach((b, i) => {
      b.classList.toggle("active", i + 1 === selected);
    });
    for (let i = 1; i <= 10; i++) {
      const color = COLORS[i - 1];
      const btn = h("button", {
        class: `priority-pick-btn${selected === i ? " active" : ""}`,
        style: { "--pc": color },
        title: `Priority ${i}`,
        onClick: (e) => {
          e.stopPropagation();
          selected = i;
          refresh();
          onChange(i);
        }
      }, String(i));
      btns.push(btn);
      wrap.appendChild(btn);
    }
    return wrap;
  }
  function customSelect(options, value, onChange) {
    let current = value;
    const chevron = createSvg(
      "10",
      "10",
      "0 0 10 10",
      '<path d="M2 3.5L5 6.5L8 3.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>'
    );
    chevron.style.flexShrink = "0";
    chevron.style.transition = "transform 0.2s ease";
    const valueEl = h("span", { class: "csel-value" }, options.find((o) => o.v === current)?.l || "");
    const trigger = h("button", { class: "csel-trigger" }, valueEl, chevron);
    const dropdown = h(
      "div",
      { class: "csel-dropdown" },
      ...options.map((o) => {
        const opt = h("div", { class: `csel-option${o.v === current ? " selected" : ""}` }, o.l);
        opt.addEventListener("click", (e) => {
          e.stopPropagation();
          current = o.v;
          valueEl.textContent = o.l;
          dropdown.querySelectorAll(".csel-option").forEach((el) => el.classList.remove("selected"));
          opt.classList.add("selected");
          onChange(o.v);
          close();
        });
        return opt;
      })
    );
    const container = h("div", { class: "csel" }, trigger, dropdown);
    function open() {
      container.classList.add("open");
      chevron.style.transform = "rotate(180deg)";
      setTimeout(() => document.addEventListener("click", outsideClick), 0);
    }
    function close() {
      container.classList.remove("open");
      chevron.style.transform = "";
      document.removeEventListener("click", outsideClick);
    }
    function outsideClick(e) {
      if (!container.contains(e.target)) close();
    }
    trigger.addEventListener("click", (e) => {
      e.stopPropagation();
      container.classList.contains("open") ? close() : open();
    });
    return container;
  }

  // src/js/components/passwordGate.js
  var REQUIRED_HASH = "" ? "" : null;
  var AUTH_KEY = "focusboard-auth";
  function isPasswordProtected() {
    return !!REQUIRED_HASH;
  }
  function isAuthenticated() {
    if (!REQUIRED_HASH) return true;
    return localStorage.getItem(AUTH_KEY) === REQUIRED_HASH;
  }
  function lockApp() {
    localStorage.removeItem(AUTH_KEY);
  }
  async function sha256hex(str) {
    const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(str));
    return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
  }
  function buildPasswordGate(onSuccess) {
    const errorEl = h("p", { class: "pg-error" });
    const input = h("input", { type: "password", class: "pg-input", placeholder: "Password", autocomplete: "current-password" });
    const btn = h("button", { class: "pg-btn" }, "Unlock");
    async function attempt() {
      const val = input.value;
      if (!val) return;
      btn.disabled = true;
      btn.textContent = "\u2026";
      const hash = await sha256hex(val);
      if (hash === REQUIRED_HASH) {
        localStorage.setItem(AUTH_KEY, hash);
        gate.remove();
        onSuccess();
      } else {
        errorEl.textContent = "Incorrect password \u2014 try again.";
        input.value = "";
        input.focus();
        btn.disabled = false;
        btn.textContent = "Unlock";
      }
    }
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") attempt();
    });
    btn.addEventListener("click", attempt);
    const gate = h(
      "div",
      { class: "pg-overlay" },
      h(
        "div",
        { class: "pg-box" },
        h(
          "div",
          { class: "pg-logo" },
          h("span", { class: "pg-logo-focus" }, "focus"),
          h("span", { class: "pg-logo-board" }, "board")
        ),
        h("p", { class: "pg-sub" }, "Enter your password to continue"),
        input,
        btn,
        errorEl
      )
    );
    requestAnimationFrame(() => input.focus());
    return gate;
  }

  // src/js/components/addForm.js
  function buildAddForm() {
    const panel = getPanelData();
    const form = S.addItemForm;
    if (!form.categoryId) {
      form.categoryId = S.activeCat || panel.categories[0]?.id || "";
    }
    const roundToNearest15 = (hrs) => Math.max(15, Math.round(parseFloat(hrs) * 60 / 15) * 15) || 60;
    const isWorkflow = form.type === "workflow";
    const makeInput = (type, placeholder, val, key, extraClass) => {
      const isTime = key === "timeNeeded";
      const displayVal = isTime ? val ? val / 60 : 1 : val || "";
      const attrs = { type, placeholder: placeholder || "", value: displayVal, class: `form-input${extraClass ? " " + extraClass : ""}` };
      if (isTime) {
        attrs.step = "0.25";
        attrs.min = "0.25";
      }
      const el = h("input", attrs);
      el.addEventListener("input", (e) => {
        S.addItemForm[key] = isTime ? roundToNearest15(e.target.value) : type === "number" ? parseInt(e.target.value) || 0 : e.target.value;
      });
      if (type === "date") el.style.colorScheme = S.theme;
      return el;
    };
    const makeSelect = (options, val, key) => customSelect(options, val, (v) => {
      S.addItemForm[key] = v;
    });
    const doAdd = () => {
      if (!S.addItemForm.title.trim()) return;
      const formData = { ...S.addItemForm };
      if (formData.nature === "waiting") formData.waitingSince = TODAY;
      addItem(formData);
    };
    const taskBtn = h("button", {
      class: `type-btn${!isWorkflow ? " active" : ""}`,
      onClick: () => {
        S.addItemForm.type = "task";
        S.addItemForm.hasDueDate = false;
        set({});
      }
    }, "Task");
    const workflowBtn = h("button", {
      class: `type-btn${isWorkflow ? " active" : ""}`,
      onClick: () => {
        S.addItemForm.type = "workflow";
        S.addItemForm.hasDueDate = false;
        set({});
      }
    }, "Workflow");
    const titleInput = makeInput(
      "text",
      isWorkflow ? "What is this workflow about?" : "What needs to be done?",
      form.title,
      "title",
      "form-input-title"
    );
    titleInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") doAdd();
    });
    setTimeout(() => titleInput.focus(), 50);
    const notesArea = h("textarea", { class: "form-input", rows: "2", placeholder: "Optional notes..." }, form.notes || "");
    notesArea.addEventListener("input", (e) => {
      S.addItemForm.notes = e.target.value;
    });
    const catOptions = panel.categories.map((c) => ({ v: c.id, l: c.name }));
    let fieldRows;
    if (isWorkflow) {
      const ddCb = h("input", { type: "checkbox", checked: !!form.hasDueDate, id: "add-wf-dd" });
      const ddLabel = h("label", { class: "wf-due-label", htmlFor: "add-wf-dd" }, ddCb, "This workflow has a due date");
      const ddInput = makeInput("date", "", form.dueDate, "dueDate");
      const ddInputWrap = h(
        "div",
        { class: "form-field", style: { display: form.hasDueDate ? "" : "none" } },
        h("div", { class: "form-field-label" }, "Due date"),
        ddInput
      );
      ddCb.addEventListener("change", (e) => {
        S.addItemForm.hasDueDate = e.target.checked;
        if (!e.target.checked) S.addItemForm.dueDate = "";
        ddInputWrap.style.display = e.target.checked ? "" : "none";
      });
      fieldRows = h(
        "div",
        { class: "form-fields" },
        h("div", { class: "form-field" }, h("div", { class: "form-field-label" }, "Title"), titleInput),
        h(
          "div",
          { class: "form-grid" },
          h("div", { class: "form-field" }, h("div", { class: "form-field-label" }, "Category"), makeSelect(catOptions, form.categoryId, "categoryId")),
          h("div", { class: "form-field add-wf-dd-field" }, ddLabel),
          ddInputWrap
        ),
        h("div", { class: "form-field" }, h("div", { class: "form-field-label" }, "Notes"), notesArea)
      );
    } else {
      const isWaiting = form.nature === "waiting";
      const actionNatureBtn = h("button", {
        class: `wft-nature-pick${!isWaiting ? " active" : ""}`,
        onClick: () => {
          S.addItemForm.nature = "action";
          set({});
        }
      }, "\u25B6 Action");
      const waitingNatureBtn = h("button", {
        class: `wft-nature-pick${isWaiting ? " active" : ""}`,
        onClick: () => {
          S.addItemForm.nature = "waiting";
          set({});
        }
      }, "\u23F3 Waiting");
      const recurOptions = [
        { v: "", l: "No repeat" },
        { v: "daily", l: "Daily" },
        { v: "weekly", l: "Weekly" },
        { v: "monthly", l: "Monthly" },
        { v: "yearly", l: "Yearly" }
      ];
      if (isWaiting && !form.chaseDate) {
        const auto = computeChaseDate(form.targetReturnDate, S.followUpDays);
        form.chaseDate = auto;
        S.addItemForm.chaseDate = auto;
      }
      const chaseDateEl = makeInput("date", "", form.chaseDate, "chaseDate");
      const targetRetEl = makeInput("date", "", form.targetReturnDate, "targetReturnDate");
      targetRetEl.addEventListener("change", (e) => {
        const auto = computeChaseDate(e.target.value, S.followUpDays);
        S.addItemForm.chaseDate = auto;
        chaseDateEl.value = auto;
      });
      const taskFieldGrid = isWaiting ? h(
        "div",
        { class: "form-grid" },
        h("div", { class: "form-field" }, h("div", { class: "form-field-label" }, "Category"), makeSelect(catOptions, form.categoryId, "categoryId")),
        h("div", { class: "form-field" }, h("div", { class: "form-field-label" }, "Waiting on"), makeInput("text", "Who or what?", form.waitingFrom, "waitingFrom")),
        h("div", { class: "form-field" }, h("div", { class: "form-field-label" }, "Target return date"), targetRetEl),
        h("div", { class: "form-field" }, h("div", { class: "form-field-label" }, "Chase date"), chaseDateEl)
      ) : h(
        "div",
        { class: "form-grid" },
        h("div", { class: "form-field" }, h("div", { class: "form-field-label" }, "Category"), makeSelect(catOptions, form.categoryId, "categoryId")),
        h("div", { class: "form-field" }, h("div", { class: "form-field-label" }, "Due date"), makeInput("date", "", form.dueDate, "dueDate")),
        h("div", { class: "form-field" }, h("div", { class: "form-field-label" }, "Time (hrs)"), makeInput("number", "1", form.timeNeeded, "timeNeeded")),
        h("div", { class: "form-field" }, h("div", { class: "form-field-label" }, "Repeat"), makeSelect(recurOptions, form.recurrence || "", "recurrence"))
      );
      const priorityField = !isWaiting ? h(
        "div",
        { class: "form-field" },
        h("div", { class: "form-field-label" }, "Default priority (auto-computed when due date + time are set)"),
        buildPriorityPicker(normalizePriority(form.priority), (v) => {
          S.addItemForm.priority = v;
        })
      ) : null;
      fieldRows = h(
        "div",
        { class: "form-fields" },
        h("div", { class: "form-field" }, h("div", { class: "form-field-label" }, "Title"), titleInput),
        h("div", { class: "wft-nature-picker form-nature-picker" }, actionNatureBtn, waitingNatureBtn),
        taskFieldGrid,
        priorityField,
        h("div", { class: "form-field" }, h("div", { class: "form-field-label" }, "Notes"), notesArea)
      );
    }
    return h(
      "div",
      { class: "add-form" },
      h(
        "div",
        { class: "add-form-header" },
        h(
          "div",
          { class: "add-form-title" },
          h("div", { style: { width: "8px", height: "8px", borderRadius: "50%", background: "#378ADD", flexShrink: "0" } }),
          `New ${S.panel} item`
        ),
        h("button", { class: "add-form-close", onClick: () => set({ showAddItem: false }) }, "\xD7")
      ),
      h("div", { class: "type-switcher" }, taskBtn, workflowBtn),
      fieldRows,
      h(
        "div",
        { class: "form-actions" },
        h("button", { class: "btn-form-cancel", onClick: () => set({ showAddItem: false }) }, "Cancel"),
        h("button", { class: "btn-form-add", onClick: doAdd }, `Add ${form.type}`)
      )
    );
  }
  function buildAddCatForm() {
    let value = "";
    const input = h("input", { class: "cat-input", placeholder: "Category name..." });
    input.addEventListener("input", (e) => {
      value = e.target.value;
    });
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && value.trim()) addCategory(value.trim());
      if (e.key === "Escape") set({ showAddCat: false });
    });
    setTimeout(() => input.focus(), 50);
    return h(
      "div",
      { class: "add-cat-form" },
      input,
      h(
        "div",
        { class: "add-cat-form-actions" },
        h("button", { class: "btn-cat-add", onClick: () => {
          if (value.trim()) addCategory(value.trim());
        } }, "Add"),
        h("button", { class: "btn-cat-cancel", onClick: () => set({ showAddCat: false }) }, "Cancel")
      )
    );
  }

  // src/js/components/settings.js
  function buildSettings() {
    const overlay = h("div", { class: "settings-overlay", onClick: () => set({ showSettings: false }) });
    const soon = () => h("span", { class: "settings-soon" }, "Coming soon");
    const row = (label, sub, control) => h(
      "div",
      { class: "settings-row" },
      h(
        "div",
        null,
        h("div", { class: "settings-row-label" }, label),
        h("div", { class: "settings-row-sub" }, sub)
      ),
      control
    );
    const themeToggle = h(
      "label",
      { class: "toggle" },
      h("input", { type: "checkbox", checked: S.theme === "dark", onChange: toggleTheme }),
      h("span", { class: "toggle-slider" })
    );
    const systemToggle = h(
      "label",
      { class: "toggle" },
      h("input", { type: "checkbox", checked: S.useSystemTheme, onChange: toggleSystemTheme }),
      h("span", { class: "toggle-slider" })
    );
    function buildCalConnect(provider, label, logoColor) {
      const isConnected = provider === "google" ? isGoogleConnected() : isOutlookConnected();
      const statusEl = h("div", { class: "cal-status" });
      if (isConnected) {
        const disconnectBtn = h("button", { class: "btn-cal-disconnect" }, "Disconnect");
        disconnectBtn.addEventListener("click", () => {
          if (provider === "google") disconnectGoogle();
          else disconnectOutlook();
          loadCalFreeMinutes();
          set({ showSettings: false });
          set({ showSettings: true });
        });
        return h(
          "div",
          { class: "cal-connect-row" },
          h(
            "div",
            { class: "cal-connected-badge" },
            h("span", { class: "cal-dot connected" }),
            `${label} connected`
          ),
          disconnectBtn
        );
      }
      let clientId = "";
      let clientSecret = "";
      const input = h("input", {
        class: "cal-client-input",
        placeholder: `${label} OAuth Client ID`,
        type: "text"
      });
      input.addEventListener("input", (e) => {
        clientId = e.target.value.trim();
      });
      const secretInput = provider === "google" ? h("input", {
        class: "cal-client-input",
        placeholder: "Client Secret",
        type: "password"
      }) : null;
      if (secretInput) secretInput.addEventListener("input", (e) => {
        clientSecret = e.target.value.trim();
      });
      const connectBtn = h("button", { class: "btn-cal-connect", style: { background: logoColor } }, `Connect ${label}`);
      connectBtn.addEventListener("click", async () => {
        if (!clientId) {
          statusEl.textContent = "Paste your Client ID first.";
          return;
        }
        if (provider === "google" && !clientSecret) {
          statusEl.textContent = "Paste your Client Secret first.";
          return;
        }
        connectBtn.disabled = true;
        connectBtn.textContent = "Connecting\u2026";
        statusEl.textContent = "";
        try {
          if (provider === "google") await connectGoogle(clientId, clientSecret);
          else await connectOutlook(clientId);
          loadCalFreeMinutes();
          set({ showSettings: false });
          set({ showSettings: true });
        } catch (err) {
          statusEl.textContent = err.message;
          connectBtn.disabled = false;
          connectBtn.textContent = `Connect ${label}`;
        }
      });
      return h(
        "div",
        { class: "cal-connect-row" },
        input,
        ...secretInput ? [secretInput] : [],
        connectBtn,
        statusEl
      );
    }
    const googleSection = h(
      "div",
      { class: "cal-provider-section" },
      h("div", { class: "cal-provider-label" }, "Google Calendar"),
      h(
        "div",
        { class: "cal-provider-hint" },
        "Need a Client ID? ",
        h("a", { href: "https://console.cloud.google.com", target: "_blank", class: "cal-link" }, "console.cloud.google.com"),
        " \u2192 Enable Calendar API \u2192 OAuth 2.0 Client (Web app, origin: ",
        h("code", null, location.origin),
        ")"
      ),
      buildCalConnect("google", "Google", "#4285F4")
    );
    const outlookSection = h(
      "div",
      { class: "cal-provider-section" },
      h("div", { class: "cal-provider-label" }, "Microsoft Outlook"),
      h(
        "div",
        { class: "cal-provider-hint" },
        "Need a Client ID? ",
        h("a", { href: "https://portal.azure.com", target: "_blank", class: "cal-link" }, "portal.azure.com"),
        " \u2192 App registrations \u2192 New \u2192 SPA, redirect URI: ",
        h("code", null, location.origin)
      ),
      buildCalConnect("outlook", "Outlook", "#0078D4")
    );
    const panel = h(
      "div",
      { class: "settings-panel" },
      h(
        "div",
        { class: "settings-header" },
        h("span", { class: "settings-title" }, "Settings"),
        h("button", { class: "settings-close", onClick: () => set({ showSettings: false }) }, "\xD7")
      ),
      h(
        "div",
        { class: "settings-body" },
        row("Dark mode", "Switch between light and dark theme", themeToggle),
        row("Use system theme", "Follow your OS dark/light preference", systemToggle),
        h("div", { class: "settings-section-heading" }, "Calendar"),
        h("div", { class: "settings-cal-block" }, googleSection, outlookSection),
        row("Working hours", "Used for priority calculations and focus block suggestions", (() => {
          const startIn = h("input", {
            type: "time",
            class: "wh-time-input",
            value: S.workStart || "09:30",
            onChange: (e) => updateWorkingHours(e.target.value, S.workEnd)
          });
          const endIn = h("input", {
            type: "time",
            class: "wh-time-input",
            value: S.workEnd || "17:30",
            onChange: (e) => updateWorkingHours(S.workStart, e.target.value)
          });
          return h("div", { class: "wh-row" }, startIn, h("span", { class: "wh-sep" }, "to"), endIn);
        })()),
        row("Focus block defaults", "Minimum slot size and buffer around meetings", (() => {
          const minBlockOpts = [15, 20, 30, 45, 60].map((v) => ({ v: String(v), l: `${v} min` }));
          const bufferOpts = [0, 5, 10, 15, 20, 30].map((v) => ({ v: String(v), l: v === 0 ? "None" : `${v} min` }));
          const minSel = h(
            "select",
            { class: "wh-time-input" },
            ...minBlockOpts.map((o) => {
              const opt = h("option", { value: o.v }, o.l);
              if (String(S.focusMinBlock) === o.v) opt.selected = true;
              return opt;
            })
          );
          minSel.addEventListener("change", (e) => updateFocusDefaults(S.focusBuffer, parseInt(e.target.value)));
          const bufSel = h(
            "select",
            { class: "wh-time-input" },
            ...bufferOpts.map((o) => {
              const opt = h("option", { value: o.v }, o.l);
              if (String(S.focusBuffer) === o.v) opt.selected = true;
              return opt;
            })
          );
          bufSel.addEventListener("change", (e) => updateFocusDefaults(parseInt(e.target.value), S.focusMinBlock));
          return h(
            "div",
            { class: "focus-defaults-col" },
            h("div", { class: "focus-defaults-row" }, h("span", { class: "wh-sep" }, "Min block"), minSel),
            h("div", { class: "focus-defaults-row" }, h("span", { class: "wh-sep" }, "Buffer"), bufSel)
          );
        })()),
        row("Follow-up trigger", "Days before target return date to set chase date", (() => {
          const inp = h("input", {
            type: "number",
            class: "wh-time-input",
            value: S.followUpDays ?? 5,
            min: "1",
            max: "60",
            style: { width: "64px" }
          });
          inp.addEventListener("change", (e) => updateFollowUpDays(Math.max(1, parseInt(e.target.value) || 5)));
          return h("div", { class: "wh-row" }, inp, h("span", { class: "wh-sep" }, "days"));
        })()),
        // Lock option — only shown when the deployed build has password protection enabled
        isPasswordProtected() ? h(
          "div",
          { class: "settings-lock-row" },
          h(
            "div",
            null,
            h("div", { class: "settings-row-label" }, "Lock app"),
            h("div", { class: "settings-row-sub" }, "Require password again on next visit")
          ),
          h("button", {
            class: "btn-lock",
            onClick: () => {
              lockApp();
              set({ showSettings: false });
            }
          }, "\u{1F512} Lock")
        ) : null
      )
    );
    const frag = document.createDocumentFragment();
    frag.appendChild(overlay);
    frag.appendChild(panel);
    return frag;
  }

  // src/js/dragdrop.js
  var drag = { id: null, catId: null };
  var ghostEl = null;
  var dropState = { targetId: null, insertBefore: true, targetCatId: null };
  var lastDroppedId = null;
  var scrollContainer = null;
  var scrollSpeed = 0;
  var scrollRAF = null;
  function startScrollLoop() {
    function loop() {
      if (scrollSpeed !== 0 && scrollContainer) {
        scrollContainer.scrollTop += scrollSpeed;
        scrollRAF = requestAnimationFrame(loop);
      } else {
        scrollRAF = null;
      }
    }
    if (!scrollRAF) scrollRAF = requestAnimationFrame(loop);
  }
  function stopScroll() {
    if (scrollRAF) {
      cancelAnimationFrame(scrollRAF);
      scrollRAF = null;
    }
    scrollSpeed = 0;
  }
  function handleGlobalDragOver(e) {
    const panel = document.querySelector(".task-panel");
    if (!panel) return;
    const rect = panel.getBoundingClientRect();
    const threshold = 100;
    const maxSpeed = 14;
    if (e.clientY > rect.bottom - threshold) {
      const intensity = (e.clientY - (rect.bottom - threshold)) / threshold;
      scrollSpeed = Math.ceil(intensity * maxSpeed);
    } else if (e.clientY < rect.top + threshold) {
      const intensity = (rect.top + threshold - e.clientY) / threshold;
      scrollSpeed = -Math.ceil(intensity * maxSpeed);
    } else {
      scrollSpeed = 0;
      stopScroll();
      return;
    }
    scrollContainer = panel;
    startScrollLoop();
  }
  function createGhost(height) {
    ghostEl = document.createElement("div");
    ghostEl.className = "drag-ghost";
    ghostEl.style.height = height + "px";
    ghostEl.style.pointerEvents = "none";
  }
  function removeGhost() {
    if (ghostEl && ghostEl.parentNode) ghostEl.parentNode.removeChild(ghostEl);
    ghostEl = null;
  }
  function cleanup() {
    removeGhost();
    stopScroll();
    document.removeEventListener("dragover", handleGlobalDragOver);
    document.querySelectorAll(".dragging").forEach((el) => el.classList.remove("dragging"));
    document.querySelectorAll(".drop-target").forEach((el) => el.classList.remove("drop-target"));
    document.body.classList.remove("is-dragging");
    drag.id = null;
    drag.catId = null;
    dropState = { targetId: null, insertBefore: true, targetCatId: null };
  }
  function onDragStart(e, id, catId) {
    drag.id = id;
    drag.catId = catId;
    lastDroppedId = null;
    dropState = { targetId: null, insertBefore: true, targetCatId: catId };
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", id);
    document.addEventListener("dragover", handleGlobalDragOver);
    setTimeout(() => {
      const el = document.querySelector(`[data-id="${id}"]`);
      if (el) {
        el.classList.add("dragging");
        createGhost(el.offsetHeight);
      } else {
        createGhost(58);
      }
      document.body.classList.add("is-dragging");
    }, 0);
  }
  function onDragEnd() {
    cleanup();
  }
  function onDragOver(e, targetId) {
    e.preventDefault();
    e.stopPropagation();
    if (!targetId || targetId === drag.id || !ghostEl) return;
    const targetEl = document.querySelector(`[data-id="${targetId}"]`);
    if (!targetEl) return;
    const rect = targetEl.getBoundingClientRect();
    const insertBefore = e.clientY < rect.top + rect.height / 2;
    dropState.targetId = targetId;
    dropState.insertBefore = insertBefore;
    if (insertBefore) {
      targetEl.parentNode.insertBefore(ghostEl, targetEl);
    } else {
      targetEl.parentNode.insertBefore(ghostEl, targetEl.nextSibling);
    }
  }
  function onDrop(e, targetId, targetCatId) {
    e.preventDefault();
    e.stopPropagation();
    const droppedId = drag.id;
    const savedDrop = { ...dropState };
    cleanup();
    if (!droppedId || !savedDrop.targetId) return;
    const newData = JSON.parse(JSON.stringify(S.data));
    const items = newData[S.panel].items;
    const fromIdx = items.findIndex((i) => i.id === droppedId);
    if (fromIdx < 0) return;
    items[fromIdx].categoryId = targetCatId;
    const [moved] = items.splice(fromIdx, 1);
    const toIdx = items.findIndex((i) => i.id === savedDrop.targetId);
    if (toIdx < 0) {
      items.push(moved);
    } else if (savedDrop.insertBefore) {
      items.splice(toIdx, 0, moved);
    } else {
      items.splice(toIdx + 1, 0, moved);
    }
    lastDroppedId = droppedId;
    upd(newData);
    setTimeout(() => {
      lastDroppedId = null;
    }, 700);
  }
  function onDropCat(e, catId) {
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.classList.remove("drop-target");
    const droppedId = drag.id;
    cleanup();
    if (!droppedId) return;
    const newData = JSON.parse(JSON.stringify(S.data));
    const items = newData[S.panel].items;
    const idx = items.findIndex((i) => i.id === droppedId);
    if (idx >= 0) items[idx].categoryId = catId;
    lastDroppedId = droppedId;
    upd(newData);
    setTimeout(() => {
      lastDroppedId = null;
    }, 700);
  }

  // src/js/components/sidebar.js
  function calendarIcon() {
    return createSvg(
      "13",
      "13",
      "0 0 14 14",
      '<rect x="1" y="2" width="12" height="11" rx="1.5" stroke="currentColor" stroke-width="1.2"/><line x1="1" y1="5.5" x2="13" y2="5.5" stroke="currentColor" stroke-width="1.2"/><line x1="4.5" y1="1" x2="4.5" y2="4" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/><line x1="9.5" y1="1" x2="9.5" y2="4" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/>'
    );
  }
  function buildCategoryItem(cat, panel) {
    const count = panel.items.filter((i) => i.categoryId === cat.id && !i.done).length;
    const isActive = S.view === "category" && S.activeCat === cat.id;
    if (S.editingCat === cat.id) {
      const input = h("input", { class: "cat-rename-input", value: cat.name });
      input.addEventListener("keydown", (e) => {
        if (e.key === "Enter" && input.value.trim()) renameCategory(cat.id, input.value.trim());
        if (e.key === "Escape") set({ editingCat: null });
      });
      setTimeout(() => {
        input.focus();
        input.select();
      }, 50);
      return h(
        "div",
        { class: "sub-item cat-editing" },
        input,
        h("button", { class: "btn-cat-add", onClick: () => {
          if (input.value.trim()) renameCategory(cat.id, input.value.trim());
        } }, "\u2713"),
        h("button", { class: "btn-cat-cancel", onClick: () => set({ editingCat: null }) }, "\u2715")
      );
    }
    const editBtn = h("button", {
      class: "cat-action-btn",
      title: "Rename",
      onClick: (e) => {
        e.stopPropagation();
        set({ editingCat: cat.id });
      }
    }, createSvg(
      "10",
      "10",
      "0 0 10 10",
      '<path d="M7 1.5l1.5 1.5L3 8.5H1.5V7L7 1.5Z" stroke="currentColor" stroke-width="1.1" fill="none" stroke-linejoin="round"/><path d="M6 2.5l1.5 1.5" stroke="currentColor" stroke-width="1.1" stroke-linecap="round"/>'
    ));
    const delBtn = h("button", {
      class: "cat-action-btn cat-delete-btn",
      title: "Delete",
      onClick: (e) => {
        e.stopPropagation();
        deleteCategory(cat.id);
      }
    }, createSvg(
      "10",
      "10",
      "0 0 10 10",
      '<path d="M2 3.5h6M4 3.5V2h2v1.5M3 3.5l.5 5h3l.5-5" stroke="currentColor" stroke-width="1.1" stroke-linecap="round" stroke-linejoin="round" fill="none"/>'
    ));
    return h(
      "div",
      {
        class: `sub-item${isActive ? " active" : ""}`,
        onClick: () => gotoCategory(cat.id),
        onDragover: (e) => {
          e.preventDefault();
          e.currentTarget.classList.add("drop-target");
        },
        onDragleave: (e) => {
          e.currentTarget.classList.remove("drop-target");
        },
        onDrop: (e) => onDropCat(e, cat.id)
      },
      h("div", { class: "sub-pip" }),
      h("span", { class: "sub-item-name" }, cat.name),
      count > 0 ? h("span", { class: "nav-count" }, count) : null,
      editBtn,
      delBtn
    );
  }
  var SB_WIDTH_KEY = "fb_sidebar_w";
  var SB_MIN = 140;
  var SB_MAX = 420;
  var SB_DEFAULT = 210;
  function getSidebarWidth() {
    try {
      return Math.min(SB_MAX, Math.max(SB_MIN, parseInt(localStorage.getItem(SB_WIDTH_KEY)) || SB_DEFAULT));
    } catch {
      return SB_DEFAULT;
    }
  }
  function makeSidebarResizeHandle(sidebarEl) {
    const handle = h("div", { class: "sidebar-resize-handle" });
    handle.addEventListener("mousedown", (e) => {
      e.preventDefault();
      const startX = e.clientX;
      const startW = sidebarEl.offsetWidth;
      document.body.classList.add("sb-resizing");
      const onMove = (e2) => {
        const w = Math.min(SB_MAX, Math.max(SB_MIN, startW + (e2.clientX - startX)));
        sidebarEl.style.setProperty("--sb-w", `${w}px`);
      };
      const onUp = (e2) => {
        const w = Math.min(SB_MAX, Math.max(SB_MIN, startW + (e2.clientX - startX)));
        try {
          localStorage.setItem(SB_WIDTH_KEY, w);
        } catch {
        }
        document.body.classList.remove("sb-resizing");
        document.removeEventListener("mousemove", onMove);
        document.removeEventListener("mouseup", onUp);
      };
      document.addEventListener("mousemove", onMove);
      document.addEventListener("mouseup", onUp);
    });
    return handle;
  }
  function buildSidebar() {
    const panel = getPanelData();
    const activeCount = panel.items.filter((i) => !i.done).length;
    const capitalize = (s) => s[0].toUpperCase() + s.slice(1);
    const savedWidth = getSidebarWidth();
    const sidebarEl = h(
      "div",
      { class: `sidebar${S.sidebarCollapsed ? " collapsed" : ""}` },
      // Panel switcher (Work / Life)
      h(
        "div",
        { class: "panel-switcher" },
        h("button", { class: `ps-btn${S.panel === "work" ? " active" : ""}`, onClick: () => switchPanel("work") }, "Work"),
        h("button", { class: `ps-btn${S.panel === "life" ? " active" : ""}`, onClick: () => switchPanel("life") }, "Life")
      ),
      // Panel section heading + Dashboard nav
      h("div", { class: "sidebar-section" }, capitalize(S.panel)),
      h(
        "div",
        { class: `nav-item${S.view === "dashboard" ? " active" : ""}`, onClick: gotoDashboard },
        h("div", { class: "nav-dot", style: { background: getPanelColor() } }),
        "Dashboard",
        h("span", { class: "nav-count" }, activeCount)
      ),
      ...panel.categories.map((cat) => buildCategoryItem(cat, panel)),
      S.showAddCat ? buildAddCatForm() : null,
      h("div", { class: "add-cat-btn", onClick: () => set({ showAddCat: !S.showAddCat, showAddItem: false }) }, "+ Add category"),
      // Insights section
      h("div", { class: "sidebar-section" }, "Insights"),
      h(
        "div",
        {
          class: `nav-item${S.view === "workload" ? " active" : ""}`,
          onClick: gotoWorkload
        },
        h("div", { class: "nav-dot", style: { background: "#7B61FF" } }),
        "Summary"
      ),
      // Schedule section
      h("div", { class: "sidebar-section" }, "Schedule"),
      h(
        "div",
        {
          class: `nav-item${S.view === "focus" ? " active" : ""}`,
          onClick: () => set({ view: "focus", activeCat: null })
        },
        h("div", { class: "nav-dot", style: { background: "#BA7517" } }),
        "Focus blocks",
        (() => {
          const n = [...S.data?.work?.items || [], ...S.data?.life?.items || []].filter((i) => i.focusBlock && !i.done).length;
          return n > 0 ? h("span", { class: "nav-count" }, n) : null;
        })()
      ),
      h("div", {
        class: `nav-item${S.view === "calendar" ? " active" : ""}`,
        onClick: () => set({ view: "calendar", activeCat: null })
      }, calendarIcon(), "Calendar")
    );
    sidebarEl.style.setProperty("--sb-w", `${savedWidth}px`);
    if (!S.sidebarCollapsed) {
      sidebarEl.appendChild(makeSidebarResizeHandle(sidebarEl));
    }
    return sidebarEl;
  }

  // src/js/components/confirm.js
  function showConfirm({ title, lines = [], confirmText = "Confirm", cancelText = "Cancel", danger = false }) {
    return new Promise((resolve) => {
      const dismiss = (ok) => {
        overlay.remove();
        resolve(ok);
      };
      const confirmBtn = h("button", {
        class: danger ? "btn btn-confirm-danger" : "btn btn-confirm-ok",
        onClick: () => dismiss(true)
      }, confirmText);
      const cancelBtn = h("button", {
        class: "btn",
        onClick: () => dismiss(false)
      }, cancelText);
      const dialog = h(
        "div",
        { class: "confirm-dialog" },
        h("div", { class: "confirm-title" }, title),
        ...lines.map((l) => h("div", { class: "confirm-line" }, l)),
        h("div", { class: "confirm-actions" }, cancelBtn, confirmBtn)
      );
      const overlay = h("div", { class: "confirm-overlay" }, dialog);
      overlay.addEventListener("click", (e) => {
        if (e.target === overlay) dismiss(false);
      });
      document.body.appendChild(overlay);
      confirmBtn.focus();
    });
  }

  // src/js/components/focusPicker.js
  function nextDates(n) {
    const dates = [];
    for (let i = 0; i < n; i++) {
      const d = /* @__PURE__ */ new Date();
      d.setDate(d.getDate() + i);
      dates.push(d.toISOString().slice(0, 10));
    }
    return dates;
  }
  function friendlyDate(dateStr) {
    const d = /* @__PURE__ */ new Date(dateStr + "T00:00:00");
    const today = /* @__PURE__ */ new Date();
    today.setHours(0, 0, 0, 0);
    const diff = Math.round((d - today) / 864e5);
    if (diff === 0) return "Today";
    if (diff === 1) return "Tomorrow";
    return d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });
  }
  function fmtMins(mins) {
    if (mins >= 60) {
      const h2 = Math.floor(mins / 60);
      const m = mins % 60;
      return m ? `${h2}h ${m}m` : `${h2}h`;
    }
    return `${mins}m`;
  }
  function fmt2(d) {
    return d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
  }
  function getSplitOptions(totalMins) {
    const opts = [{
      label: `Full session (${fmtMins(totalMins)})`,
      sessionDurations: [totalMins]
    }];
    if (totalMins > 60) {
      const hours = Math.floor(totalMins / 60);
      const remainder = totalMins % 60;
      const durations = [...Array(hours).fill(60), ...remainder > 0 ? [remainder] : []];
      if (durations.length > 1) {
        opts.push({ label: buildSplitLabel(durations), sessionDurations: durations });
      }
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
      parts.push(count > 1 ? `${count} \xD7 ${fmtMins(val)}` : fmtMins(val));
      i += count;
    }
    return parts.join(" + ");
  }
  function buildFocusPicker(task, onClose) {
    const totalMins = task.timeNeeded || 60;
    const splitOpts = totalMins > 60 ? getSplitOptions(totalMins) : null;
    const dates = nextDates(7);
    let selectedDate = dates[0];
    let selectedSplit = splitOpts ? splitOpts[0] : { label: "", sessionDurations: [totalMins] };
    let bookedCount = 0;
    const currentMins = () => selectedSplit.sessionDurations[Math.min(bookedCount, selectedSplit.sessionDurations.length - 1)];
    const totalSessions = () => selectedSplit.sessionDurations.length;
    const slotArea = h("div", { class: "fp-slots" });
    const statusEl = h("div", { class: "fp-status" });
    const progressEl = h("div", { class: "fp-progress" });
    function updateProgress() {
      progressEl.innerHTML = "";
      const total = totalSessions();
      if (total <= 1) return;
      const remaining = total - bookedCount;
      const nextMins = currentMins();
      progressEl.appendChild(
        h(
          "div",
          { class: "fp-progress-bar" },
          h(
            "span",
            { class: "fp-progress-label" },
            bookedCount > 0 ? `\u2713 ${bookedCount} booked \u2014 pick session ${bookedCount + 1} (${fmtMins(nextMins)})` : `Pick ${total} sessions: ${selectedSplit.sessionDurations.map(fmtMins).join(", ")}`
          ),
          ...selectedSplit.sessionDurations.map(
            (_, i) => h("div", { class: `fp-pip${i < bookedCount ? " done" : ""}` })
          )
        )
      );
    }
    async function loadSlots(dateStr) {
      slotArea.innerHTML = "";
      statusEl.textContent = "";
      if (!isAnyConnected()) {
        statusEl.textContent = "Connect a calendar in Settings to see available slots.";
        return;
      }
      statusEl.textContent = "Checking your calendar\u2026";
      try {
        const slotMins = Math.max(currentMins(), S.focusMinBlock ?? 30);
        const slots = await getFreeSlots(dateStr, slotMins, S.workStart, S.workEnd, S.focusBuffer ?? 15);
        statusEl.textContent = "";
        if (!slots.length) {
          statusEl.textContent = `No free ${fmtMins(currentMins())} slots on ${friendlyDate(dateStr)}.`;
          return;
        }
        slots.forEach((slot) => {
          const btn = h("button", { class: "fp-slot-btn" }, slot.label);
          btn.addEventListener("click", () => confirmSlot(slot));
          slotArea.appendChild(btn);
        });
      } catch (err) {
        statusEl.textContent = `Error: ${err.message}`;
      }
    }
    async function confirmSlot(slot) {
      const start = new Date(slot.startISO);
      const end = new Date(slot.endISO);
      const dayStr = start.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "short" });
      const total = totalSessions();
      const isSplit = total > 1;
      const isLast = bookedCount + 1 >= total;
      const ok = await showConfirm({
        title: isSplit ? `Book session ${bookedCount + 1} of ${total}?` : "Book focus block?",
        lines: [
          `Task: ${task.title}`,
          `Time: ${dayStr}, ${fmt2(start)} \u2013 ${fmt2(end)}`,
          `Duration: ${fmtMins(currentMins())}`,
          isSplit && !isLast ? `${total - bookedCount - 1} more session${total - bookedCount - 1 !== 1 ? "s" : ""} to book after this` : ""
        ].filter(Boolean),
        confirmText: "Book it"
      });
      if (!ok) return;
      slotArea.innerHTML = "";
      statusEl.textContent = "Booking\u2026";
      try {
        await bookFocusBlock(task, slot.startISO, slot.endISO);
        const sessionData = {
          day: start.toLocaleDateString("en-GB", { weekday: "short" }),
          date: slot.startISO.slice(0, 10),
          start: fmt2(start),
          end: fmt2(end),
          startISO: slot.startISO,
          endISO: slot.endISO
        };
        if (task._onBook) task._onBook(sessionData);
        else addFocusSession(task.id, sessionData);
        bookedCount++;
        updateProgress();
        if (bookedCount >= total) {
          onClose();
        } else {
          statusEl.textContent = "";
          statusEl.style.color = "#1D9E75";
          statusEl.textContent = `\u2713 Session ${bookedCount} booked! Now pick a ${fmtMins(currentMins())} slot.`;
          loadSlots(selectedDate);
        }
      } catch (err) {
        statusEl.textContent = `Booking failed: ${err.message}`;
      }
    }
    let splitRow = null;
    if (splitOpts && splitOpts.length > 1) {
      const splitBtns = splitOpts.map((opt, i) => {
        const btn = h("button", { class: `fp-split-btn${i === 0 ? " active" : ""}` }, opt.label);
        btn.addEventListener("click", () => {
          splitBtns.forEach((b) => b.classList.remove("active"));
          btn.classList.add("active");
          selectedSplit = opt;
          bookedCount = 0;
          updateProgress();
          loadSlots(selectedDate);
        });
        return btn;
      });
      splitRow = h(
        "div",
        { class: "fp-split-row" },
        h("span", { class: "fp-split-label" }, "Sessions:"),
        ...splitBtns
      );
    }
    const dateTabs = h(
      "div",
      { class: "fp-dates" },
      ...dates.map((d) => {
        const btn = h("button", { class: `fp-date-btn${d === selectedDate ? " active" : ""}` }, friendlyDate(d));
        btn.addEventListener("click", () => {
          selectedDate = d;
          dateTabs.querySelectorAll(".fp-date-btn").forEach((b) => b.classList.remove("active"));
          btn.classList.add("active");
          loadSlots(d);
        });
        return btn;
      })
    );
    loadSlots(selectedDate);
    updateProgress();
    return h(
      "div",
      { class: "focus-picker" },
      h(
        "div",
        { class: "fp-header" },
        h("span", { class: "fp-title" }, `Find a focus slot \xB7 ${fmtMins(totalMins)}`),
        h("button", { class: "fp-close", onClick: onClose }, "\xD7")
      ),
      splitRow,
      progressEl,
      dateTabs,
      statusEl,
      slotArea
    );
  }
  function getItemSessions(item) {
    if (item.focusSessions?.length) return item.focusSessions;
    if (item.focusBlock) return [item.focusBlock];
    return [];
  }
  function getBookedMins(item) {
    return getItemSessions(item).reduce((sum, s) => {
      if (s.startISO && s.endISO) return sum + (new Date(s.endISO) - new Date(s.startISO)) / 6e4;
      const [sh, sm] = (s.start || "0:0").split(":").map(Number);
      const [eh, em] = (s.end || "0:0").split(":").map(Number);
      return sum + (eh * 60 + em - (sh * 60 + sm));
    }, 0);
  }

  // src/js/workflowActions.js
  function addWorkflowTask(workflowId, taskData) {
    const newData = JSON.parse(JSON.stringify(S.data));
    const items = newData[S.panel].items;
    const idx = items.findIndex((i) => i.id === workflowId);
    if (idx < 0) return;
    if (!items[idx].tasks) items[idx].tasks = [];
    items[idx].tasks.push({
      id: uid(),
      nature: taskData.nature || "action",
      subNature: taskData.subNature || "",
      title: taskData.title || "",
      status: "active",
      // action fields
      dueDate: taskData.dueDate || "",
      priority: taskData.priority || 5,
      timeNeeded: taskData.timeNeeded || 60,
      focusSessions: [],
      // waiting fields
      waitingSince: taskData.waitingSince || "",
      followUpDays: taskData.followUpDays || 5,
      waitingFrom: taskData.waitingFrom || "",
      notes: taskData.notes || ""
    });
    upd(newData);
  }
  function updateWorkflowTask(workflowId, taskId, changes) {
    const newData = JSON.parse(JSON.stringify(S.data));
    const items = newData[S.panel].items;
    const idx = items.findIndex((i) => i.id === workflowId);
    if (idx < 0) return;
    const task = items[idx].tasks?.find((t) => t.id === taskId);
    if (task) Object.assign(task, changes);
    upd(newData);
  }
  function deleteWorkflowTask(workflowId, taskId) {
    const newData = JSON.parse(JSON.stringify(S.data));
    const items = newData[S.panel].items;
    const idx = items.findIndex((i) => i.id === workflowId);
    if (idx < 0) return;
    items[idx].tasks = (items[idx].tasks || []).filter((t) => t.id !== taskId);
    upd(newData);
  }
  function closeWorkflowTask(workflowId, taskId) {
    const newData = JSON.parse(JSON.stringify(S.data));
    const items = newData[S.panel].items;
    const idx = items.findIndex((i) => i.id === workflowId);
    if (idx < 0) return;
    const task = items[idx].tasks?.find((t) => t.id === taskId);
    if (task) {
      task.status = "closed";
      task.closedAt = TODAY;
    }
    upd(newData);
  }
  function completeWorkflowTaskWithSend(workflowId, taskId) {
    const newData = JSON.parse(JSON.stringify(S.data));
    const items = newData[S.panel].items;
    const idx = items.findIndex((i) => i.id === workflowId);
    if (idx < 0) return;
    const workflow = items[idx];
    const task = workflow.tasks?.find((t) => t.id === taskId);
    if (task) {
      task.status = "complete-with-actions";
      task.closedAt = TODAY;
      if (!workflow.tasks) workflow.tasks = [];
      workflow.tasks.push({
        id: uid(),
        nature: "send",
        title: task.title,
        // original title; UI prefixes "Send '" or "Chase '"
        isChase: task.nature === "waiting",
        // chase comes from a waiting task, send from an action
        // Carry over the previous waiting task's target return date so the chase form can default to it
        inheritedTargetReturnDate: task.targetReturnDate || "",
        status: "active",
        sent: false,
        waitingFrom: task.waitingFrom || "",
        waitingSince: "",
        focusSessions: [],
        dueDate: "",
        priority: "",
        timeNeeded: 0,
        subNature: "",
        notes: "",
        spawnedFrom: taskId
      });
    }
    upd(newData);
  }
  function markSendAndStartWaiting(workflowId, sendTaskId, waitingFrom, targetReturnDate, chaseDate) {
    const newData = JSON.parse(JSON.stringify(S.data));
    const items = newData[S.panel].items;
    const idx = items.findIndex((i) => i.id === workflowId);
    if (idx < 0) return;
    const workflow = items[idx];
    const sendTask = workflow.tasks?.find((t) => t.id === sendTaskId);
    if (sendTask) {
      sendTask.status = "closed";
      sendTask.closedAt = TODAY;
      sendTask.sent = true;
      workflow.tasks.push({
        id: uid(),
        nature: "waiting",
        subNature: "Awaiting response",
        title: sendTask.title,
        status: "active",
        waitingFrom: waitingFrom || "",
        targetReturnDate: targetReturnDate || "",
        chaseDate: chaseDate || "",
        waitingSince: TODAY,
        dueDate: "",
        priority: "",
        timeNeeded: 0,
        focusSessions: [],
        notes: "",
        spawnedFrom: sendTaskId
      });
    }
    upd(newData);
  }
  function completeWorkflowTaskWithActions(workflowId, taskId) {
    const newData = JSON.parse(JSON.stringify(S.data));
    const items = newData[S.panel].items;
    const idx = items.findIndex((i) => i.id === workflowId);
    if (idx < 0) return;
    const workflow = items[idx];
    const task = workflow.tasks?.find((t) => t.id === taskId);
    if (task) {
      task.status = "complete-with-actions";
      task.closedAt = TODAY;
      if (!workflow.tasks) workflow.tasks = [];
      workflow.tasks.push({
        id: uid(),
        nature: "pending",
        subNature: "",
        title: "",
        status: "active",
        dueDate: "",
        priority: 5,
        timeNeeded: 60,
        focusSessions: [],
        waitingSince: "",
        followUpDays: 5,
        waitingFrom: "",
        notes: "",
        spawnedFrom: taskId
      });
    }
    upd(newData);
  }
  function addWorkflowTaskFocusSession(workflowId, taskId, session) {
    const newData = JSON.parse(JSON.stringify(S.data));
    const items = newData[S.panel].items;
    const idx = items.findIndex((i) => i.id === workflowId);
    if (idx < 0) return;
    const task = items[idx].tasks?.find((t) => t.id === taskId);
    if (!task) return;
    if (!task.focusSessions) task.focusSessions = [];
    task.focusSessions.push(session);
    upd(newData);
  }
  function removeWorkflowTaskFocusSession(workflowId, taskId, sessionIdx) {
    const newData = JSON.parse(JSON.stringify(S.data));
    const items = newData[S.panel].items;
    const idx = items.findIndex((i) => i.id === workflowId);
    if (idx < 0) return;
    const task = items[idx].tasks?.find((t) => t.id === taskId);
    if (!task || !task.focusSessions) return;
    task.focusSessions.splice(sessionIdx, 1);
    upd(newData);
  }
  function addChecklistItem(itemId, title) {
    const newData = JSON.parse(JSON.stringify(S.data));
    const items = newData[S.panel].items;
    const idx = items.findIndex((i) => i.id === itemId);
    if (idx < 0) return;
    if (!items[idx].checklist) items[idx].checklist = [];
    items[idx].checklist.push({ id: uid(), title, done: false });
    upd(newData);
  }
  function toggleChecklistItem(itemId, checkId) {
    const newData = JSON.parse(JSON.stringify(S.data));
    const items = newData[S.panel].items;
    const idx = items.findIndex((i) => i.id === itemId);
    if (idx < 0) return;
    const check = items[idx].checklist?.find((c) => c.id === checkId);
    if (check) check.done = !check.done;
    upd(newData);
  }
  function deleteChecklistItem(itemId, checkId) {
    const newData = JSON.parse(JSON.stringify(S.data));
    const items = newData[S.panel].items;
    const idx = items.findIndex((i) => i.id === itemId);
    if (idx < 0) return;
    items[idx].checklist = (items[idx].checklist || []).filter((c) => c.id !== checkId);
    upd(newData);
  }
  function addWfTaskChecklistItem(workflowId, taskId, title) {
    const newData = JSON.parse(JSON.stringify(S.data));
    const items = newData[S.panel].items;
    const idx = items.findIndex((i) => i.id === workflowId);
    if (idx < 0) return;
    const task = items[idx].tasks?.find((t) => t.id === taskId);
    if (!task) return;
    if (!task.checklist) task.checklist = [];
    task.checklist.push({ id: uid(), title, done: false });
    upd(newData);
  }
  function toggleWfTaskChecklistItem(workflowId, taskId, checkId) {
    const newData = JSON.parse(JSON.stringify(S.data));
    const items = newData[S.panel].items;
    const idx = items.findIndex((i) => i.id === workflowId);
    if (idx < 0) return;
    const task = items[idx].tasks?.find((t) => t.id === taskId);
    if (!task) return;
    const check = task.checklist?.find((c) => c.id === checkId);
    if (check) check.done = !check.done;
    upd(newData);
  }
  function deleteWfTaskChecklistItem(workflowId, taskId, checkId) {
    const newData = JSON.parse(JSON.stringify(S.data));
    const items = newData[S.panel].items;
    const idx = items.findIndex((i) => i.id === workflowId);
    if (idx < 0) return;
    const task = items[idx].tasks?.find((t) => t.id === taskId);
    if (!task) return;
    task.checklist = (task.checklist || []).filter((c) => c.id !== checkId);
    upd(newData);
  }

  // src/js/components/taskBody.js
  var RECUR_OPTIONS = [
    { v: "", l: "No repeat" },
    { v: "daily", l: "Daily" },
    { v: "weekly", l: "Weekly" },
    { v: "monthly", l: "Monthly" },
    { v: "yearly", l: "Yearly" }
  ];
  function buildChecklist(checklist, { onAdd, onToggle, onDelete }) {
    const list = checklist || [];
    const done = list.filter((c) => c.done).length;
    const total = list.length;
    const itemsWrap = h("div", { class: "cl-items" });
    list.forEach((c) => {
      const cb = h("input", { type: "checkbox", class: "cl-check", checked: c.done });
      cb.addEventListener("change", (e) => {
        e.stopPropagation();
        onToggle(c.id);
      });
      itemsWrap.appendChild(h(
        "div",
        { class: `cl-item${c.done ? " done" : ""}` },
        cb,
        h("span", { class: "cl-title" }, c.title),
        h("button", { class: "cl-del", title: "Remove", onClick: (e) => {
          e.stopPropagation();
          onDelete(c.id);
        } }, "\xD7")
      ));
    });
    const addInput = h("input", { class: "cl-add-input", placeholder: "Add subtask\u2026", type: "text" });
    const addBtn = h("button", { class: "cl-add-btn" }, "+");
    const doAdd = () => {
      const val = addInput.value.trim();
      if (val) {
        addInput.value = "";
        onAdd(val);
      }
    };
    addInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        doAdd();
      }
    });
    addBtn.addEventListener("click", doAdd);
    const header = h(
      "div",
      { class: "cl-header" },
      h("span", { class: "cl-label" }, "Subtasks"),
      total > 0 ? h("span", { class: `cl-progress${done === total ? " all-done" : ""}` }, `${done}/${total}`) : null
    );
    return h(
      "div",
      { class: "cl-wrap" },
      header,
      itemsWrap,
      h("div", { class: "cl-add-row" }, addInput, addBtn)
    );
  }
  function buildEditForm(item, editing) {
    const roundToNearest15 = (hrs) => Math.max(15, Math.round(parseFloat(hrs) * 60 / 15) * 15) || 60;
    const isWorkflow = item.type === "workflow";
    const makeInput = (type, val, key) => {
      const isTime = key === "timeNeeded";
      const displayVal = isTime ? val ? val / 60 : 1 : val;
      const attrs = { class: "edit-input", type, value: displayVal };
      if (isTime) {
        attrs.step = "0.25";
        attrs.min = "0.25";
      }
      const input = h("input", attrs);
      input.addEventListener("input", (e) => {
        editing[key] = isTime ? roundToNearest15(e.target.value) : type === "number" ? parseInt(e.target.value) || 0 : e.target.value;
      });
      return input;
    };
    const ef = (lbl, input) => h("div", { class: "edit-field" }, h("div", { class: "edit-field-label" }, lbl), input);
    const ta = h("textarea", { class: "edit-input", rows: "2", style: { lineHeight: "1.5" } }, editing.notes || "");
    ta.addEventListener("input", (e) => {
      editing.notes = e.target.value;
    });
    if (isWorkflow) {
      return [
        h(
          "div",
          { class: "edit-grid", style: { gridTemplateColumns: "1fr" } },
          ef("Title", makeInput("text", editing.title, "title"))
        ),
        h("div", { class: "edit-field", style: { marginBottom: "10px" } }, h("div", { class: "edit-field-label" }, "Notes"), ta),
        h(
          "div",
          { class: "edit-actions" },
          h("button", { class: "btn-dark btn-sm", onClick: () => saveEdit(item.id) }, "Save"),
          h("button", { class: "btn-ghost btn-sm", onClick: () => cancelEdit(item.id) }, "Cancel")
        )
      ];
    }
    return [
      h(
        "div",
        { class: "edit-grid" },
        ef("Title", makeInput("text", editing.title, "title")),
        ef("Due date", makeInput("date", editing.dueDate, "dueDate")),
        ef("Time (hrs)", makeInput("number", editing.timeNeeded, "timeNeeded"))
      ),
      h(
        "div",
        { class: "edit-field", style: { marginBottom: "8px" } },
        h("div", { class: "edit-field-label" }, "Default priority (used when no due date / time set)"),
        buildPriorityPicker(normalizePriority(editing.priority), (v) => {
          editing.priority = v;
        })
      ),
      h(
        "div",
        { class: "edit-field", style: { marginBottom: "8px" } },
        h("div", { class: "edit-field-label" }, "Repeat"),
        customSelect(RECUR_OPTIONS, editing.recurrence || "", (v) => {
          editing.recurrence = v;
        })
      ),
      h("div", { class: "edit-field", style: { marginBottom: "10px" } }, h("div", { class: "edit-field-label" }, "Notes"), ta),
      h(
        "div",
        { class: "edit-actions" },
        h("button", { class: "btn-dark btn-sm", onClick: () => saveEdit(item.id) }, "Save"),
        h("button", { class: "btn-ghost btn-sm", onClick: () => cancelEdit(item.id) }, "Cancel")
      )
    ];
  }
  function buildTaskBody(item, overdue) {
    const roundToNearest15 = (hrs) => Math.max(15, Math.round(parseFloat(hrs) * 60 / 15) * 15) || 60;
    const sessions = getItemSessions(item);
    const hasSessions = sessions.length > 0;
    const bookedMins = getBookedMins(item);
    const totalMins = item.timeNeeded || 0;
    const remaining = Math.max(0, totalMins - bookedMins);
    const children = [];
    if (!item.done) {
      const notesIn = h("textarea", { class: "wft-notes-input", placeholder: "Notes\u2026", rows: "2" }, item.notes || "");
      notesIn.addEventListener("change", (e) => updateItem(item.id, { notes: e.target.value }));
      if (item.nature === "waiting") {
        const daysOut = item.waitingSince ? daysBefore(item.waitingSince) : null;
        const chaseNeeded = item.chaseDate ? daysBefore(item.chaseDate) >= 0 : false;
        const waitingFromIn = h("input", { class: "wft-inline-input", value: item.waitingFrom || "", placeholder: "Who or what?" });
        waitingFromIn.addEventListener("change", (e) => updateItem(item.id, { waitingFrom: e.target.value.trim() }));
        const chaseDateIn = h("input", { class: "wft-inline-input", type: "date", value: item.chaseDate || "" });
        chaseDateIn.addEventListener("change", (e) => updateItem(item.id, { chaseDate: e.target.value }));
        const targetReturnIn = h("input", { class: "wft-inline-input", type: "date", value: item.targetReturnDate || "" });
        targetReturnIn.addEventListener("change", (e) => {
          const auto = computeChaseDate(e.target.value, S.followUpDays);
          if (!item.chaseDate) {
            chaseDateIn.value = auto;
            updateItem(item.id, { targetReturnDate: e.target.value, chaseDate: auto });
          } else {
            updateItem(item.id, { targetReturnDate: e.target.value });
          }
        });
        let stagnationEl = null;
        if (daysOut !== null) {
          const parts = [h("span", { class: "wft-days-out" }, `${daysOut} day${daysOut !== 1 ? "s" : ""} waiting`)];
          if (chaseNeeded) parts.push(h("span", { class: "badge badge-timer" }, "\u26A1 Chase due"));
          else if (item.chaseDate) {
            const dLeft = -daysBefore(item.chaseDate);
            parts.push(h("span", { class: "wft-field-label" }, `\xB7 chase in ${dLeft} day${dLeft !== 1 ? "s" : ""}`));
          }
          stagnationEl = h("div", { class: `wft-stagnation${chaseNeeded ? " chase-due" : ""}` }, ...parts);
        }
        children.push(
          h(
            "div",
            { class: "wft-body-fields" },
            h("div", { class: "wft-body-field" }, h("span", { class: "wft-field-label" }, "Waiting on"), waitingFromIn),
            h("div", { class: "wft-body-field" }, h("span", { class: "wft-field-label" }, "Target return"), targetReturnIn),
            h("div", { class: "wft-body-field" }, h("span", { class: "wft-field-label" }, "Chase date"), chaseDateIn)
          ),
          stagnationEl,
          h("div", { class: "wft-body-field wft-notes-field" }, h("span", { class: "wft-field-label" }, "Notes"), notesIn)
        );
      } else {
        const dueDateIn = h("input", { class: "wft-inline-input", type: "date", value: item.dueDate || "" });
        dueDateIn.addEventListener("change", (e) => updateItem(item.id, { dueDate: e.target.value }));
        const prioritySel = buildPriorityPicker(normalizePriority(item.priority), (v) => updateItem(item.id, { priority: v }));
        const timeIn = h("input", { class: "wft-inline-input wft-time-input", type: "number", value: item.timeNeeded ? item.timeNeeded / 60 : 1, min: "0.25", step: "0.25" });
        timeIn.addEventListener("change", (e) => updateItem(item.id, { timeNeeded: roundToNearest15(e.target.value) }));
        children.push(
          h(
            "div",
            { class: "wft-body-fields" },
            h("div", { class: "wft-body-field" }, h("span", { class: "wft-field-label" }, "Due"), dueDateIn),
            h("div", { class: "wft-body-field wft-priority-field" }, h("span", { class: "wft-field-label" }, "Priority"), prioritySel),
            h("div", { class: "wft-body-field" }, h("span", { class: "wft-field-label" }, "Time (hrs)"), timeIn)
          ),
          h("div", { class: "wft-body-field wft-notes-field" }, h("span", { class: "wft-field-label" }, "Notes"), notesIn)
        );
      }
      const container = h("div", { class: "focus-picker-wrap" });
      let pickerVisible = false;
      let pickerEl = null;
      if (hasSessions) {
        const pillsWrap = h("div", { class: "focus-sessions" });
        sessions.forEach((s, i) => {
          pillsWrap.appendChild(h(
            "div",
            { class: "focus-pill" },
            h("span", { class: "focus-pill-time" }, `${s.start} \u2013 ${s.end}`),
            h("span", { class: "focus-pill-day" }, s.day),
            h("button", {
              class: "focus-pill-remove",
              title: "Remove session",
              onClick: (e) => {
                e.stopPropagation();
                removeFocusSession(item.id, i);
              }
            }, "\xD7")
          ));
        });
        container.appendChild(pillsWrap);
        if (remaining > 0) container.appendChild(h("div", { class: "fp-remaining" }, `${formatTime(remaining)} still unscheduled`));
      }
      const togglePicker = () => {
        if (pickerVisible) {
          pickerEl?.remove();
          pickerEl = null;
          pickerVisible = false;
          actionBtn.textContent = hasSessions ? "+ Add another session" : "+ Suggest focus block";
        } else {
          pickerEl = buildFocusPicker(item, () => {
            pickerEl?.remove();
            pickerEl = null;
            pickerVisible = false;
          });
          container.appendChild(pickerEl);
          pickerVisible = true;
          actionBtn.textContent = "\u2212 Hide";
        }
      };
      const actionBtn = h("button", { class: "suggest-btn" }, hasSessions ? "+ Add another session" : "+ Suggest focus block");
      actionBtn.addEventListener("click", togglePicker);
      container.appendChild(actionBtn);
      children.push(container);
    } else {
      const eff = getEffectivePriority(item);
      const isComp = isCompetitionPriority(item.id);
      const auto = !isComp && isPriorityAuto(item);
      const color = getPriorityColor(eff);
      const suffix = isComp ? " \u2191" : auto ? " \u26A1" : "";
      const mode = isComp ? "competition" : auto ? "auto" : "manual";
      const priorityEl = h(
        "div",
        null,
        h("div", { class: "exp-label" }, "Priority"),
        h(
          "div",
          { class: "exp-value", style: { color, fontWeight: "600" } },
          `P${eff}${suffix}`,
          h("span", { style: { fontWeight: "400", color: "var(--text4)", fontSize: "11px", marginLeft: "5px" } }, mode)
        )
      );
      children.push(h(
        "div",
        { class: "exp-grid" },
        expField("Due", item.dueDate ? formatDate(item.dueDate) : "\u2014", overdue ? "overdue" : ""),
        expField("Time needed", formatTime(item.timeNeeded)),
        priorityEl
      ));
      if (item.notes) {
        children.push(h(
          "div",
          { style: { marginBottom: "10px" } },
          h("div", { class: "exp-label" }, "Notes"),
          h("div", { style: { fontSize: "13px", color: "var(--text2)", lineHeight: "1.5" } }, item.notes)
        ));
      }
      if (hasSessions) {
        const pillsWrap = h("div", { class: "focus-sessions" });
        sessions.forEach((s) => {
          pillsWrap.appendChild(h(
            "div",
            { class: "focus-pill" },
            h("span", { class: "focus-pill-time" }, `${s.start} \u2013 ${s.end}`),
            h("span", { class: "focus-pill-day" }, s.day)
          ));
        });
        children.push(pillsWrap);
      }
    }
    children.push(buildChecklist(item.checklist, {
      onAdd: (title) => addChecklistItem(item.id, title),
      onToggle: (id) => toggleChecklistItem(item.id, id),
      onDelete: (id) => deleteChecklistItem(item.id, id)
    }));
    return children;
  }

  // src/js/components/workflowTask.js
  function buildWfFocusPickerToggle(workflow, wfTask) {
    const virtualTask = {
      id: `${workflow.id}::${wfTask.id}`,
      title: wfTask.title || "Task",
      timeNeeded: wfTask.timeNeeded || 60,
      focusSessions: wfTask.focusSessions || [],
      _onBook: (session) => addWorkflowTaskFocusSession(workflow.id, wfTask.id, session)
    };
    const sessions = wfTask.focusSessions || [];
    const hasSessions = sessions.length > 0;
    const bookedMins = getBookedMins(virtualTask);
    const remaining = Math.max(0, (wfTask.timeNeeded || 0) - bookedMins);
    const wrap = h("div", { class: "focus-picker-wrap" });
    let pickerVisible = false;
    let pickerEl = null;
    if (hasSessions) {
      const pillsWrap = h("div", { class: "focus-sessions" });
      sessions.forEach((s, i) => {
        pillsWrap.appendChild(h(
          "div",
          { class: "focus-pill" },
          h("span", { class: "focus-pill-time" }, `${s.start} \u2013 ${s.end}`),
          h("span", { class: "focus-pill-day" }, s.day),
          h("button", {
            class: "focus-pill-remove",
            onClick: (e) => {
              e.stopPropagation();
              removeWorkflowTaskFocusSession(workflow.id, wfTask.id, i);
            }
          }, "\xD7")
        ));
      });
      wrap.appendChild(pillsWrap);
      if (remaining > 0) wrap.appendChild(h("div", { class: "fp-remaining" }, `${formatTime(remaining)} still unscheduled`));
    }
    const togglePicker = () => {
      if (pickerVisible) {
        pickerEl?.remove();
        pickerEl = null;
        pickerVisible = false;
        actionBtn.textContent = hasSessions ? "+ Add session" : "+ Suggest focus block";
      } else {
        pickerEl = buildFocusPicker(virtualTask, () => {
          pickerEl?.remove();
          pickerEl = null;
          pickerVisible = false;
        });
        wrap.appendChild(pickerEl);
        pickerVisible = true;
        actionBtn.textContent = "\u2212 Hide";
      }
    };
    const actionBtn = h("button", { class: "suggest-btn" }, hasSessions ? "+ Add session" : "+ Suggest focus block");
    actionBtn.addEventListener("click", togglePicker);
    wrap.appendChild(actionBtn);
    return wrap;
  }
  function buildWfActionBody(workflow, task) {
    const roundToNearest15 = (hrs) => Math.max(15, Math.round(parseFloat(hrs) * 60 / 15) * 15) || 60;
    const subNatureIn = h("input", { class: "wft-inline-input", value: task.subNature || "", placeholder: "e.g. Draft, Review\u2026" });
    subNatureIn.addEventListener("change", (e) => updateWorkflowTask(workflow.id, task.id, { subNature: e.target.value.trim() }));
    const dueDateIn = h("input", { class: "wft-inline-input", type: "date", value: task.dueDate || "" });
    dueDateIn.addEventListener("change", (e) => updateWorkflowTask(workflow.id, task.id, { dueDate: e.target.value }));
    const prioritySel = buildPriorityPicker(normalizePriority(task.priority), (v) => updateWorkflowTask(workflow.id, task.id, { priority: v }));
    const timeIn = h("input", { class: "wft-inline-input wft-time-input", type: "number", value: task.timeNeeded ? task.timeNeeded / 60 : 1, min: "0.25", step: "0.25" });
    timeIn.addEventListener("change", (e) => {
      updateWorkflowTask(workflow.id, task.id, { timeNeeded: roundToNearest15(e.target.value) });
    });
    const notesIn = h("textarea", { class: "wft-notes-input", placeholder: "Notes\u2026", rows: "2" }, task.notes || "");
    notesIn.addEventListener("change", (e) => updateWorkflowTask(workflow.id, task.id, { notes: e.target.value }));
    return h(
      "div",
      { class: "wft-body" },
      h(
        "div",
        { class: "wft-body-fields" },
        h("div", { class: "wft-body-field" }, h("span", { class: "wft-field-label" }, "Sub-type"), subNatureIn),
        h("div", { class: "wft-body-field" }, h("span", { class: "wft-field-label" }, "Due"), dueDateIn),
        h("div", { class: "wft-body-field wft-priority-field" }, h("span", { class: "wft-field-label" }, "Priority"), prioritySel),
        h("div", { class: "wft-body-field" }, h("span", { class: "wft-field-label" }, "Time (hrs)"), timeIn)
      ),
      h("div", { class: "wft-body-field wft-notes-field" }, h("span", { class: "wft-field-label" }, "Notes"), notesIn),
      buildWfFocusPickerToggle(workflow, task),
      buildChecklist(task.checklist, {
        onAdd: (title) => addWfTaskChecklistItem(workflow.id, task.id, title),
        onToggle: (id) => toggleWfTaskChecklistItem(workflow.id, task.id, id),
        onDelete: (id) => deleteWfTaskChecklistItem(workflow.id, task.id, id)
      })
    );
  }
  function buildWfWaitingBody(workflow, task) {
    const daysOut = task.waitingSince ? daysBefore(task.waitingSince) : null;
    const chaseNeeded = task.chaseDate ? daysBefore(task.chaseDate) >= 0 : daysOut !== null && daysOut >= (task.followUpDays || 5);
    const subNatureIn = h("input", { class: "wft-inline-input", value: task.subNature || "", placeholder: "e.g. Approval, Review\u2026" });
    subNatureIn.addEventListener("change", (e) => updateWorkflowTask(workflow.id, task.id, { subNature: e.target.value.trim() }));
    const waitingFromIn = h("input", { class: "wft-inline-input", value: task.waitingFrom || "", placeholder: "Who or what are you waiting on?" });
    waitingFromIn.addEventListener("change", (e) => updateWorkflowTask(workflow.id, task.id, { waitingFrom: e.target.value.trim() }));
    const targetReturnIn = h("input", { class: "wft-inline-input", type: "date", value: task.targetReturnDate || "" });
    targetReturnIn.addEventListener("change", (e) => updateWorkflowTask(workflow.id, task.id, { targetReturnDate: e.target.value }));
    const chaseDateIn = h("input", { class: "wft-inline-input", type: "date", value: task.chaseDate || "" });
    chaseDateIn.addEventListener("change", (e) => updateWorkflowTask(workflow.id, task.id, { chaseDate: e.target.value }));
    const notesIn = h("textarea", { class: "wft-notes-input", placeholder: "Notes\u2026", rows: "2" }, task.notes || "");
    notesIn.addEventListener("change", (e) => updateWorkflowTask(workflow.id, task.id, { notes: e.target.value }));
    let stagnationContent = null;
    if (daysOut !== null) {
      const parts = [h("span", { class: "wft-days-out" }, `${daysOut} day${daysOut !== 1 ? "s" : ""} waiting`)];
      if (chaseNeeded) {
        parts.push(h("span", { class: "badge badge-timer" }, "\u26A1 Chase due"));
      } else if (task.chaseDate) {
        const dLeft = -daysBefore(task.chaseDate);
        parts.push(h("span", { class: "wft-field-label" }, `\xB7 chase in ${dLeft} day${dLeft !== 1 ? "s" : ""}`));
      }
      stagnationContent = h("div", { class: `wft-stagnation${chaseNeeded ? " chase-due" : ""}` }, ...parts);
    }
    const chaseBtn = h("button", {
      class: "wft-send-btn",
      title: "Chase \u2014 closes this task and creates a Chase task",
      onClick: () => completeWorkflowTaskWithSend(workflow.id, task.id)
    }, "\u{1F4E4} Chase now");
    const receivedBtn = h("button", {
      class: "wft-close-btn",
      title: "Response received \u2014 closes this task and opens a new task",
      onClick: () => completeWorkflowTaskWithActions(workflow.id, task.id)
    }, "\u2713 Response received");
    return h(
      "div",
      { class: "wft-body" },
      h(
        "div",
        { class: "wft-body-fields" },
        h("div", { class: "wft-body-field" }, h("span", { class: "wft-field-label" }, "Sub-type"), subNatureIn),
        h("div", { class: "wft-body-field" }, h("span", { class: "wft-field-label" }, "Waiting on"), waitingFromIn),
        h("div", { class: "wft-body-field" }, h("span", { class: "wft-field-label" }, "Target return date"), targetReturnIn),
        h("div", { class: "wft-body-field" }, h("span", { class: "wft-field-label" }, "Follow-up / chase date"), chaseDateIn)
      ),
      stagnationContent,
      h("div", { class: "wft-body-field wft-notes-field" }, h("span", { class: "wft-field-label" }, "Notes"), notesIn),
      buildChecklist(task.checklist, {
        onAdd: (title) => addWfTaskChecklistItem(workflow.id, task.id, title),
        onToggle: (id) => toggleWfTaskChecklistItem(workflow.id, task.id, id),
        onDelete: (id) => deleteWfTaskChecklistItem(workflow.id, task.id, id)
      }),
      h("div", { class: "wft-waiting-actions" }, chaseBtn, receivedBtn)
    );
  }
  function buildWfTaskRow(workflow, task) {
    const isActive = task.status === "active";
    if (isActive && task.nature === "pending") {
      let chosenNature = "action";
      let subNature = "";
      let title = "";
      const actionBtn = h("button", { class: "wft-nature-pick active" }, "\u25B6 Action");
      const waitingBtn = h("button", { class: "wft-nature-pick" }, "\u23F3 Waiting");
      actionBtn.addEventListener("click", () => {
        chosenNature = "action";
        actionBtn.classList.add("active");
        waitingBtn.classList.remove("active");
      });
      waitingBtn.addEventListener("click", () => {
        chosenNature = "waiting";
        waitingBtn.classList.add("active");
        actionBtn.classList.remove("active");
      });
      const subNatureIn = h("input", { class: "wft-add-input", placeholder: "Sub-type (e.g. Draft, Review, Approval)" });
      subNatureIn.addEventListener("input", (e) => {
        subNature = e.target.value;
      });
      const titleIn = h("input", { class: "wft-add-input wft-add-title", placeholder: "Task title" });
      titleIn.addEventListener("input", (e) => {
        title = e.target.value;
      });
      const confirmBtn = h("button", { class: "btn-dark btn-sm", onClick: () => {
        if (!title.trim()) {
          titleIn.focus();
          return;
        }
        updateWorkflowTask(workflow.id, task.id, {
          nature: chosenNature,
          subNature: subNature.trim(),
          title: title.trim(),
          // waitingSince marks when the wait started, not applicable to actions
          waitingSince: chosenNature === "waiting" ? TODAY : ""
        });
      } }, "Confirm");
      const cancelBtn = h("button", { class: "btn-ghost btn-sm", onClick: () => deleteWorkflowTask(workflow.id, task.id) }, "Cancel");
      const row = h(
        "div",
        { class: "wft-row wft-pending" },
        h("div", { class: "wft-pending-label" }, "\u21AA Follow-on task"),
        h("div", { class: "wft-nature-picker" }, actionBtn, waitingBtn),
        subNatureIn,
        titleIn,
        h("div", { class: "wft-add-actions" }, confirmBtn, cancelBtn)
      );
      setTimeout(() => titleIn.focus(), 0);
      return row;
    }
    if (isActive && task.nature === "send") {
      const isChase = !!task.isChase;
      const displayTitle = isChase ? `Chase '${task.title}'` : `Send '${task.title}'`;
      const badge = isChase ? "\u{1F4E4} Chase" : "\u{1F4E4} Send";
      let waitingFrom = task.waitingFrom || "";
      let targetReturnDate = task.inheritedTargetReturnDate || "";
      let chaseDate = "";
      const formWrap = h("div", { class: "wft-send-form", style: { display: "none" } });
      const waitingFromIn = h("input", { class: "wft-add-input wft-add-input-wide", placeholder: "Who are you waiting on?", value: waitingFrom });
      waitingFromIn.addEventListener("input", (e) => {
        waitingFrom = e.target.value;
      });
      const targetReturnIn = h("input", { type: "date", class: "wft-add-input", value: targetReturnDate });
      targetReturnIn.addEventListener("input", (e) => {
        targetReturnDate = e.target.value;
      });
      const chaseDateIn = h("input", { type: "date", class: "wft-add-input", value: chaseDate });
      chaseDateIn.addEventListener("input", (e) => {
        chaseDate = e.target.value;
      });
      const confirmBtn = h("button", { class: "btn-dark btn-sm", onClick: () => {
        markSendAndStartWaiting(workflow.id, task.id, waitingFrom, targetReturnDate, chaseDate);
      } }, "\u2713 Confirm & start waiting");
      const cancelBtn = h("button", { class: "btn-ghost btn-sm", onClick: () => {
        formWrap.style.display = "none";
        sentBtn.style.display = "";
      } }, "Cancel");
      formWrap.appendChild(h(
        "div",
        { class: "wft-send-chase-form" },
        h("div", { class: "wft-field-label", style: { marginBottom: "6px" } }, "Set up waiting task"),
        h(
          "div",
          { class: "wft-add-row" },
          h("div", { class: "wft-add-field wft-add-field-wide" }, h("span", { class: "wft-field-label" }, "Waiting on"), waitingFromIn)
        ),
        h(
          "div",
          { class: "wft-add-row" },
          h("div", { class: "wft-add-field" }, h("span", { class: "wft-field-label" }, "Target return date"), targetReturnIn),
          h("div", { class: "wft-add-field" }, h("span", { class: "wft-field-label" }, "Follow-up / chase date"), chaseDateIn)
        ),
        h("div", { class: "wft-add-actions", style: { marginTop: "8px" } }, confirmBtn, cancelBtn)
      ));
      const sentBtn = h("button", { class: "wft-sent-btn", onClick: () => {
        sentBtn.style.display = "none";
        formWrap.style.display = "";
        waitingFromIn.focus();
      } }, isChase ? "\u2713 Mark as chased" : "\u2713 Mark as sent");
      const delBtn2 = h("button", {
        class: "wft-del-btn",
        title: "Delete",
        onClick: (e) => {
          e.stopPropagation();
          deleteWorkflowTask(workflow.id, task.id);
        }
      }, "\xD7");
      return h(
        "div",
        { class: "wft-row wft-send-row" },
        h(
          "div",
          { class: "wft-send-header" },
          h("span", { class: "wft-send-badge" }, badge),
          h("span", { class: "wft-send-title" }, displayTitle),
          h("div", { class: "wft-header-actions" }, sentBtn, delBtn2)
        ),
        formWrap
      );
    }
    if (!isActive) {
      const statusIcon = task.status === "closed" ? "\u2713" : "\u21AA";
      const statusClass = task.status === "closed" ? "wft-icon-closed" : "wft-icon-done-new";
      const natureLabel2 = task.nature === "action" ? "Action" : "Waiting";
      const subLabel2 = task.subNature ? ` \xB7 ${task.subNature}` : "";
      const reopenBtn = h("button", {
        class: "wft-reopen-btn",
        title: "Reopen task",
        onClick: () => updateWorkflowTask(workflow.id, task.id, { status: "active", closedAt: null })
      }, "Reopen");
      return h(
        "div",
        { class: "wft-row wft-closed" },
        h("span", { class: `wft-status-dot ${statusClass}` }, statusIcon),
        h("span", { class: "wft-closed-nature" }, `${natureLabel2}${subLabel2}`),
        h("span", { class: "wft-closed-title" }, task.title || "(untitled)"),
        task.closedAt ? h("span", { class: "wft-closed-date" }, task.closedAt) : null,
        reopenBtn
      );
    }
    const stateKey = `wft::${workflow.id}::${task.id}`;
    const expanded = S.expandedCards[stateKey] !== false;
    const isAction = task.nature === "action";
    const natureLabel = isAction ? "\u25B6 Action" : "\u23F3 Waiting";
    const subLabel = task.subNature ? ` \xB7 ${task.subNature}` : "";
    const natureBadge = h(
      "span",
      { class: `wft-nature-badge ${isAction ? "wft-action" : "wft-waiting"}` },
      natureLabel + subLabel
    );
    const titleInput = h("input", { class: "wft-title-input", value: task.title, placeholder: "Task title\u2026" });
    titleInput.addEventListener("change", (e) => updateWorkflowTask(workflow.id, task.id, { title: e.target.value.trim() }));
    const cl = task.checklist || [];
    const clDone = cl.filter((c) => c.done).length;
    const clBadge = cl.length > 0 ? h("span", { class: `wft-cl-badge${clDone === cl.length ? " all-done" : ""}` }, `${clDone}/${cl.length} \u2713`) : null;
    const closeBtn = h("button", {
      class: "wft-close-btn",
      title: "Mark complete \u2014 no follow-up",
      onClick: (e) => {
        e.stopPropagation();
        closeWorkflowTask(workflow.id, task.id);
      }
    }, "\u2713 Complete");
    const sendBtn = h("button", {
      class: "wft-send-btn",
      title: "Send \u2014 creates a sent tick and waiting task",
      onClick: (e) => {
        e.stopPropagation();
        completeWorkflowTaskWithSend(workflow.id, task.id);
      }
    }, "\u{1F4E4} Send");
    const doneNewBtn = h("button", {
      class: "wft-done-new-btn",
      title: "Done \u2014 opens follow-on task picker",
      onClick: (e) => {
        e.stopPropagation();
        completeWorkflowTaskWithActions(workflow.id, task.id);
      }
    }, "\u21AA More to do");
    const delBtn = h("button", {
      class: "wft-del-btn",
      title: "Delete task",
      onClick: (e) => {
        e.stopPropagation();
        deleteWorkflowTask(workflow.id, task.id);
      }
    }, "\xD7");
    const toggleBtn = h("button", {
      class: `wft-toggle-btn${expanded ? " open" : ""}`,
      onClick: (e) => {
        e.stopPropagation();
        const ec = { ...S.expandedCards };
        ec[stateKey] = !expanded;
        set({ expandedCards: ec });
      }
    }, createSvg("10", "10", "0 0 10 10", '<path d="M2 3.5L5 6.5L8 3.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>'));
    const header = h(
      "div",
      { class: "wft-header" },
      natureBadge,
      titleInput,
      clBadge,
      h("div", { class: "wft-header-actions" }, closeBtn, sendBtn, doneNewBtn, delBtn),
      toggleBtn
    );
    const body = h("div", { class: `wft-body-wrap${expanded ? " open" : ""}` });
    if (expanded) {
      body.appendChild(isAction ? buildWfActionBody(workflow, task) : buildWfWaitingBody(workflow, task));
    }
    return h("div", { class: `wft-row wft-active${!isAction ? " wft-waiting-row" : ""}` }, header, body);
  }
  function buildAddWfTaskForm(workflow, container) {
    let nature = "action";
    let subNature = "";
    let title = "";
    let dueDate = "";
    let priority = 5;
    let timeHrs = "1";
    let waitingFrom = "";
    let followUpDays = "5";
    const actionBtn = h("button", { class: "wft-nature-pick active" }, "\u25B6 Action");
    const waitingBtn = h("button", { class: "wft-nature-pick" }, "\u23F3 Waiting");
    const actionFields = h("div", { class: "wft-add-extra" });
    const waitingFields = h("div", { class: "wft-add-extra", style: { display: "none" } });
    const dueDateIn = h("input", { type: "date", class: "wft-add-input", value: "" });
    dueDateIn.addEventListener("change", (e) => {
      dueDate = e.target.value;
    });
    const prioritySel = buildPriorityPicker(5, (v) => {
      priority = v;
    });
    const timeIn = h("input", { type: "number", class: "wft-add-input wft-add-input-sm", value: "1", min: "0.25", step: "0.25" });
    timeIn.addEventListener("input", (e) => {
      timeHrs = e.target.value;
    });
    actionFields.appendChild(h(
      "div",
      { class: "wft-add-rows" },
      h(
        "div",
        { class: "wft-add-row" },
        h("div", { class: "wft-add-field" }, h("span", { class: "wft-field-label" }, "Due"), dueDateIn),
        h("div", { class: "wft-add-field" }, h("span", { class: "wft-field-label" }, "Time (hrs)"), timeIn)
      ),
      h("div", { class: "wft-add-field wft-priority-field" }, h("span", { class: "wft-field-label" }, "Default priority"), prioritySel)
    ));
    const waitingFromIn = h("input", { class: "wft-add-input wft-add-input-wide", placeholder: "Who or what are you waiting on?" });
    waitingFromIn.addEventListener("input", (e) => {
      waitingFrom = e.target.value;
    });
    const followUpIn = h("input", { type: "number", class: "wft-add-input wft-add-input-sm", value: "5", min: "1" });
    followUpIn.addEventListener("input", (e) => {
      followUpDays = e.target.value;
    });
    waitingFields.appendChild(h(
      "div",
      { class: "wft-add-row" },
      h("div", { class: "wft-add-field" }, h("span", { class: "wft-field-label" }, "Waiting on"), waitingFromIn),
      h("div", { class: "wft-add-field" }, h("span", { class: "wft-field-label" }, "Chase after (days)"), followUpIn)
    ));
    actionBtn.addEventListener("click", () => {
      nature = "action";
      actionBtn.classList.add("active");
      waitingBtn.classList.remove("active");
      actionFields.style.display = "";
      waitingFields.style.display = "none";
    });
    waitingBtn.addEventListener("click", () => {
      nature = "waiting";
      waitingBtn.classList.add("active");
      actionBtn.classList.remove("active");
      waitingFields.style.display = "";
      actionFields.style.display = "none";
    });
    const subNatureIn = h("input", { class: "wft-add-input", placeholder: "Sub-type (e.g. Draft, Review, Approval)" });
    subNatureIn.addEventListener("input", (e) => {
      subNature = e.target.value;
    });
    const titleIn = h("input", { class: "wft-add-input wft-add-title", placeholder: "Task title" });
    titleIn.addEventListener("input", (e) => {
      title = e.target.value;
    });
    const addBtn = h("button", { class: "btn-dark btn-sm", onClick: () => {
      if (!title.trim()) {
        titleIn.focus();
        return;
      }
      const mins = Math.max(15, Math.round(parseFloat(timeHrs) * 60 / 15) * 15) || 60;
      addWorkflowTask(workflow.id, {
        nature,
        subNature: subNature.trim(),
        title: title.trim(),
        dueDate: nature === "action" ? dueDate : "",
        priority: nature === "action" ? priority : "",
        timeNeeded: nature === "action" ? mins : 0,
        waitingFrom: nature === "waiting" ? waitingFrom.trim() : "",
        followUpDays: nature === "waiting" ? parseInt(followUpDays) || 5 : 5,
        waitingSince: nature === "waiting" ? TODAY : ""
      });
    } }, "+ Add task");
    const cancelBtn = h("button", { class: "btn-ghost btn-sm", onClick: () => form.remove() }, "Cancel");
    const form = h(
      "div",
      { class: "wft-add-form" },
      h(
        "div",
        { class: "wft-add-row wft-add-top" },
        h("div", { class: "wft-nature-picker" }, actionBtn, waitingBtn),
        subNatureIn
      ),
      h("div", { class: "wft-add-field wft-add-title-field" }, titleIn),
      actionFields,
      waitingFields,
      h("div", { class: "wft-add-actions" }, addBtn, cancelBtn)
    );
    container.appendChild(form);
    titleIn.focus();
  }
  function buildWorkflowBody(item) {
    const tasks = item.tasks || [];
    const activeTasks = tasks.filter((t) => t.status === "active");
    const closedTasks = tasks.filter((t) => t.status !== "active");
    const hasDueDateCb = h("input", { type: "checkbox", id: `wf-dd-${item.id}`, checked: !!item.hasDueDate });
    hasDueDateCb.addEventListener("change", (e) => {
      updateItem(item.id, { hasDueDate: e.target.checked, dueDate: e.target.checked ? item.dueDate || "" : "" });
    });
    let dueDateSection = null;
    if (item.hasDueDate) {
      const ddIn = h("input", { class: "wft-inline-input", type: "date", value: item.dueDate || "" });
      ddIn.addEventListener("change", (e) => updateItem(item.id, { dueDate: e.target.value }));
      dueDateSection = h(
        "div",
        { class: "wf-due-row" },
        h("span", { class: "wft-field-label" }, "Due date"),
        ddIn
      );
    }
    const dueDateRow = h(
      "div",
      { class: "wf-due-option" },
      h("label", { class: "wf-due-label", htmlFor: `wf-dd-${item.id}` }, hasDueDateCb, "This workflow has a due date"),
      dueDateSection
    );
    const taskList = h("div", { class: "wft-list" });
    activeTasks.forEach((task) => taskList.appendChild(buildWfTaskRow(item, task)));
    if (closedTasks.length > 0) {
      const closedWrap = h(
        "div",
        { class: "wft-closed-section" },
        h("div", { class: "wft-closed-header" }, `${closedTasks.length} completed`)
      );
      closedTasks.forEach((task) => closedWrap.appendChild(buildWfTaskRow(item, task)));
      taskList.appendChild(closedWrap);
    }
    if (tasks.length === 0) {
      taskList.appendChild(h("div", { class: "wft-empty" }, "No tasks yet \u2014 add one below"));
    }
    const addTaskBtn = h("button", { class: "wft-add-btn" }, "+ Add task");
    addTaskBtn.addEventListener("click", () => {
      addTaskBtn.style.display = "none";
      buildAddWfTaskForm(item, taskList);
      taskList.appendChild(addTaskBtn);
      addTaskBtn.style.display = "";
    });
    const closeWfBtn = h("button", {
      class: "wf-close-btn",
      onClick: () => updateItem(item.id, { done: !item.done })
    }, item.done ? "\u21A9 Reopen workflow" : "\u2713 Close workflow");
    return [
      dueDateRow,
      h("div", { class: "wf-section-label" }, "Tasks"),
      taskList,
      addTaskBtn,
      h("div", { class: "wf-footer-row" }, closeWfBtn)
    ];
  }

  // src/js/components/card.js
  function priorityBadge(p, isAuto, isCompetition) {
    const color = getPriorityColor(p);
    const suffix = isCompetition ? " \u2191" : isAuto ? " \u26A1" : "";
    return h("span", {
      class: "priority-badge",
      style: { background: `${color}22`, color, border: `1px solid ${color}55` }
    }, `P${p}${suffix}`);
  }
  function workflowIcon() {
    return h(
      "div",
      { class: "wf-icon" },
      createSvg(
        "10",
        "10",
        "0 0 10 10",
        '<circle cx="2" cy="2" r="1.5" fill="#185FA5"/><circle cx="8" cy="2" r="1.5" fill="#185FA5"/><circle cx="5" cy="8" r="1.5" fill="#185FA5"/><line x1="2" y1="2" x2="8" y2="2" stroke="#185FA5" stroke-width="1"/><line x1="8" y1="2" x2="5" y2="8" stroke="#185FA5" stroke-width="1"/>'
      )
    );
  }
  function checkIcon() {
    return createSvg(
      "8",
      "8",
      "0 0 8 8",
      '<path d="M1.5 4L3 5.5L6.5 2" stroke="white" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>'
    );
  }
  function buildTaskMeta(item, overdue) {
    const children = [];
    const eff = getEffectivePriority(item);
    const isComp = isCompetitionPriority(item.id);
    const auto = !isComp && isPriorityAuto(item);
    children.push(priorityBadge(eff, auto && !item.done, isComp && !item.done));
    if (item.nature === "waiting" && !item.done) {
      const label = item.waitingFrom ? `\u23F3 Waiting \xB7 ${item.waitingFrom}` : "\u23F3 Waiting";
      children.push(h("span", { class: "badge badge-awaiting" }, label));
    }
    if (item.dueDate) {
      const color = overdue ? "#A32D2D" : item.done ? "#1D9E75" : "var(--text3)";
      const label = item.done && item.doneAt ? `Done ${item.doneAt}` : formatDue(item.dueDate);
      children.push(h("span", { style: { fontSize: "11px", color } }, label));
    }
    if (item.timeNeeded && !item.done) {
      children.push(h("span", { style: { fontSize: "11px", color: "var(--text3)" } }, `\xB7 ${Math.round(item.timeNeeded / 60 * 10) / 10}h needed`));
    }
    if (item.recurrence) {
      const labels = { daily: "Daily", weekly: "Weekly", monthly: "Monthly", yearly: "Yearly" };
      children.push(h("span", { class: "badge badge-recur" }, `\u21BB ${labels[item.recurrence] || item.recurrence}`));
    }
    const cl = item.checklist || [];
    if (cl.length > 0) {
      const clDone = cl.filter((c) => c.done).length;
      const allDone = clDone === cl.length;
      children.push(h("span", { class: `cl-meta-badge${allDone ? " all-done" : ""}` }, `\u2611 ${clDone}/${cl.length}`));
    }
    const sessions = getItemSessions(item);
    if (sessions.length > 0) {
      const bookedMins = getBookedMins(item);
      const totalMins = item.timeNeeded || 0;
      const label = sessions.length === 1 ? `\u{1F4C5} ${sessions[0].day} ${sessions[0].start}\u2013${sessions[0].end} \u270E` : `\u{1F4C5} ${sessions.length} sessions \xB7 ${Math.round(bookedMins / 60 * 10) / 10}h booked \u270E`;
      const incomplete = totalMins > 0 && bookedMins < totalMins;
      const fb = h("span", {
        class: `badge badge-focus focus-badge-clickable${incomplete ? " badge-focus-incomplete" : ""}`,
        title: "Click to change focus time",
        onClick: (e) => {
          e.stopPropagation();
          toggleCard(item.id);
        }
      }, label);
      children.push(fb);
    }
    if (!item.done && S.calFreeMinutes > 0) {
      const pressure = getCalPressure(item, S.calFreeMinutes);
      if (pressure >= 0.25) {
        const pct = Math.min(999, Math.round(pressure * 100));
        children.push(h("span", {
          class: "badge badge-cal-pressure",
          title: `Uses ~${pct}% of your free time today (${Math.round(S.calFreeMinutes / 60 * 10) / 10}h available)`
        }, `\u23F1 ${pct}% of today`));
      }
    }
    return h("div", { class: "card-meta" }, ...children);
  }
  function buildWorkflowMeta(item) {
    const tasks = item.tasks || [];
    const activeTasks = tasks.filter((t) => t.status === "active");
    const closedCount = tasks.filter((t) => t.status !== "active").length;
    const children = [];
    if (item.done) {
      children.push(h("span", { class: "badge", style: { background: "#EAF3DE", color: "#3B6D11" } }, "\u2713 Workflow closed"));
      children.push(h("button", {
        class: "wf-reopen-inline-btn",
        onClick: (e) => {
          e.stopPropagation();
          updateItem(item.id, { done: false });
        }
      }, "\u21A9 Reopen"));
      return h("div", { class: "card-meta" }, ...children);
    }
    const wfPriority = getEffectivePriority(item);
    const isComp = isCompetitionPriority(item.id);
    if (wfPriority) children.push(priorityBadge(wfPriority, !isComp, isComp));
    if (tasks.length === 0) {
      children.push(h("span", { class: "badge badge-awaiting" }, "No tasks yet"));
    } else {
      const label = activeTasks.length === 0 ? `All ${closedCount} task${closedCount !== 1 ? "s" : ""} done` : `${activeTasks.length} active${closedCount > 0 ? ` \xB7 ${closedCount} done` : ""}`;
      children.push(h("span", { class: "badge badge-awaiting" }, label));
    }
    if (item.hasDueDate && item.dueDate) {
      const overdue = isOverdue(item.dueDate) && !item.done;
      children.push(h(
        "span",
        { style: { fontSize: "11px", color: overdue ? "#A32D2D" : "var(--text3)" } },
        `\xB7 ${formatDue(item.dueDate)}`
      ));
    }
    return h("div", { class: "card-meta" }, ...children);
  }
  function buildMoreContent(item) {
    const moreOpen = !!S.moreOpenCards[item.id];
    const moreChildren = [];
    if (item.type === "workflow" && item.notes) {
      moreChildren.push(h(
        "div",
        { style: { marginBottom: "10px" } },
        h("div", { class: "exp-label" }, "Notes"),
        h("div", { style: { fontSize: "13px", color: "var(--text2)", lineHeight: "1.5" } }, item.notes)
      ));
    }
    moreChildren.push(h(
      "div",
      { class: "more-btn-row" },
      h("button", { class: "btn-ghost btn-sm", onClick: () => startEdit(item.id) }, "Edit"),
      h("button", {
        class: "btn-ghost btn-sm",
        title: item.type === "task" ? "Convert to workflow" : "Convert to task",
        onClick: () => convertItem(item.id)
      }, item.type === "task" ? "\u21C4 Convert to workflow" : "\u21C4 Convert to task")
    ));
    const label = item.type === "task" ? "Options" : "Notes & options";
    return [
      h(
        "button",
        { class: "more-toggle", onClick: () => toggleMore(item.id) },
        (moreOpen ? "\u25B2" : "\u25BC") + ` ${label}`
      ),
      h("div", { class: `more-content${moreOpen ? " open" : ""}` }, ...moreChildren)
    ];
  }
  function buildCard(item, catId) {
    const expanded = !!S.expandedCards[item.id];
    const editing = S.editingCards[item.id];
    const overdue = isOverdue(item.dueDate) && !item.done;
    const draggable = S.view === "category";
    const expandBtn = h(
      "button",
      { class: `expand-btn${expanded ? " open" : ""}`, onClick: (e) => {
        e.stopPropagation();
        toggleCard(item.id);
      } },
      createSvg("10", "10", "0 0 10 10", '<path d="M2 3.5L5 6.5L8 3.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>')
    );
    const editBtn = h("button", {
      class: "card-action-btn",
      title: "Edit",
      onClick: (e) => {
        e.stopPropagation();
        startEdit(item.id);
      }
    }, createSvg(
      "11",
      "11",
      "0 0 11 11",
      '<path d="M7.5 1.5l2 2L3 10H1V8L7.5 1.5Z" stroke="currentColor" stroke-width="1.2" fill="none" stroke-linejoin="round"/><path d="M6.5 2.5l2 2" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/>'
    ));
    const deleteBtn = h("button", {
      class: "card-action-btn card-delete-btn",
      title: "Delete",
      onClick: (e) => {
        e.stopPropagation();
        deleteItem(item.id);
      }
    }, createSvg(
      "11",
      "11",
      "0 0 11 11",
      '<path d="M2 3.5h7M4.5 3.5V2h2v1.5M3.5 3.5l.5 5h3l.5-5" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round" fill="none"/>'
    ));
    const handle = draggable ? h("span", { class: "drag-handle" }, "\u283F") : h("span", { class: "drag-handle", style: { visibility: "hidden" } });
    const icon = item.type === "workflow" ? workflowIcon() : h("div", { class: `checkbox${item.done ? " checked" : ""}`, onClick: (e) => {
      e.stopPropagation();
      toggleDone(item.id);
    } }, item.done ? checkIcon() : null);
    const titleEl = h("div", { class: `card-title${item.done ? " strikethrough" : ""}` }, item.title);
    const cardTop = h("div", { class: "card-top", style: { cursor: "pointer" } }, handle, icon, titleEl, editBtn, deleteBtn, expandBtn);
    const metaRow = item.type === "task" ? buildTaskMeta(item, overdue) : buildWorkflowMeta(item);
    if (S.view === "dashboard" || S.searchQuery) {
      const allCats = [...S.data.work?.categories || [], ...S.data.life?.categories || []];
      const cat = allCats.find((c) => c.id === item.categoryId);
      if (cat) metaRow.appendChild(h("span", { class: "cat-chip" }, cat.name));
    }
    let bodyChildren;
    if (editing) {
      bodyChildren = buildEditForm(item, editing);
    } else {
      const viewChildren = item.type === "task" ? buildTaskBody(item, overdue) : buildWorkflowBody(item);
      bodyChildren = [...viewChildren, ...buildMoreContent(item)];
    }
    const body = h("div", { class: `expanded-body${expanded ? " open" : ""}` }, ...bodyChildren.filter(Boolean));
    const attrs = {
      class: `task-card${item.type === "workflow" ? " workflow" : ""}${expanded ? " expanded" : ""}${item.done ? " done-card" : ""}${lastDroppedId === item.id ? " just-dropped" : ""}${draggable ? "" : " no-drag"}`,
      "data-id": item.id
    };
    attrs.onClick = (e) => {
      if (e.target.closest("button, input, textarea, select, a, .checkbox, .wf-icon, .expanded-body")) return;
      toggleCard(item.id);
    };
    if (draggable) {
      attrs.draggable = "true";
      attrs["data-cat"] = catId;
      attrs.onDragstart = (e) => {
        if (e.target.closest("input, textarea, select, [contenteditable]")) {
          e.preventDefault();
          return;
        }
        onDragStart(e, item.id, catId);
      };
      attrs.onDragend = onDragEnd;
      attrs.onDragover = (e) => onDragOver(e, item.id);
      attrs.onDrop = (e) => onDrop(e, item.id, catId);
    }
    return h("div", attrs, cardTop, metaRow, body);
  }
  function renderSections(items, catId, opts = {}) {
    const { hideDone = false } = opts;
    setCompetitionMap(computeCompetitionMap(items, S.calFreeMinutes));
    const overdue = items.filter((i) => isOverdue(i.dueDate) && !i.done);
    const dueToday = items.filter((i) => !isOverdue(i.dueDate) && i.dueDate === TODAY && !i.done);
    const upcoming = items.filter((i) => i.dueDate && !isOverdue(i.dueDate) && i.dueDate !== TODAY && !i.done);
    const noDue = items.filter((i) => !i.dueDate && !i.done);
    const done = items.filter((i) => i.done);
    const frag = document.createDocumentFragment();
    const addSection = (label, sectionItems) => {
      if (!sectionItems.length) return;
      frag.appendChild(h("div", { class: "group-label" }, label));
      sectionItems.forEach((item) => frag.appendChild(buildCard(item, catId || item.categoryId)));
    };
    addSection("Overdue", overdue);
    addSection("Today", dueToday);
    addSection("Upcoming", upcoming);
    addSection("No due date", noDue);
    if (!hideDone) addSection("Completed", done);
    return frag;
  }

  // src/js/components/calendarView.js
  var HOUR_START = 7;
  var HOUR_END = 21;
  var HOUR_HEIGHT = 64;
  var DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  function startOfWeek(date) {
    const d = new Date(date);
    const dow = d.getDay();
    d.setDate(d.getDate() - (dow === 0 ? 6 : dow - 1));
    d.setHours(0, 0, 0, 0);
    return d;
  }
  function addDays(date, n) {
    const d = new Date(date);
    d.setDate(d.getDate() + n);
    return d;
  }
  function toDateStr(d) {
    return [d.getFullYear(), String(d.getMonth() + 1).padStart(2, "0"), String(d.getDate()).padStart(2, "0")].join("-");
  }
  function fmtTime(ms) {
    return new Date(ms).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
  }
  function fmtWeekLabel(ws) {
    const we = addDays(ws, 6);
    const opts = { month: "short", day: "numeric" };
    const endOpts = { ...opts, year: "numeric" };
    return `${ws.toLocaleDateString("en-GB", opts)} \u2013 ${we.toLocaleDateString("en-GB", endOpts)}`;
  }
  function buildCalendarView() {
    const weekStart = S.calWeekStart ? /* @__PURE__ */ new Date(S.calWeekStart + "T00:00:00") : startOfWeek(/* @__PURE__ */ new Date());
    const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
    const todayStr = toDateStr(/* @__PURE__ */ new Date());
    const totalHours = HOUR_END - HOUR_START;
    const header = h(
      "div",
      { class: "cal-header" },
      h(
        "div",
        { class: "cal-nav" },
        h("button", { class: "cal-nav-btn", onClick: () => set({ calWeekStart: toDateStr(addDays(weekStart, -7)) }) }, "\u2039"),
        h("button", { class: "cal-today-btn", onClick: () => set({ calWeekStart: toDateStr(startOfWeek(/* @__PURE__ */ new Date())) }) }, "Today"),
        h("button", { class: "cal-nav-btn", onClick: () => set({ calWeekStart: toDateStr(addDays(weekStart, 7)) }) }, "\u203A"),
        h("span", { class: "cal-week-label" }, fmtWeekLabel(weekStart))
      ),
      !isAnyConnected() ? h("span", { class: "cal-warning" }, "\u26A0 No calendar connected \u2014 connect one in Settings") : null
    );
    const dayHeaders = h(
      "div",
      { class: "cal-day-headers" },
      h("div", { class: "cal-corner" }),
      ...days.map((d, i) => {
        const ds = toDateStr(d);
        const isToday = ds === todayStr;
        return h(
          "div",
          { class: `cal-day-header${isToday ? " today" : ""}` },
          h("span", { class: "cal-dname" }, DAY_NAMES[i]),
          h("span", { class: `cal-dnum${isToday ? " today" : ""}` }, d.getDate())
        );
      })
    );
    const timeLabels = h(
      "div",
      { class: "cal-time-col" },
      ...Array.from({ length: totalHours }, (_, i) => {
        const h24 = HOUR_START + i;
        const label = h24 === 0 ? "12 AM" : h24 < 12 ? `${h24} AM` : h24 === 12 ? "12 PM" : `${h24 - 12} PM`;
        const el = h("div", { class: "cal-time-label" }, label);
        el.style.top = `${i * HOUR_HEIGHT}px`;
        return el;
      })
    );
    const dayColumns = days.map((d) => {
      const ds = toDateStr(d);
      const col = h("div", { class: `cal-day-col${ds === todayStr ? " today" : ""}` });
      col.dataset.date = ds;
      col.style.height = `${totalHours * HOUR_HEIGHT}px`;
      for (let i = 0; i < totalHours; i++) {
        const line = h("div", { class: "cal-hour-line" });
        line.style.top = `${i * HOUR_HEIGHT}px`;
        col.appendChild(line);
      }
      for (let i = 0; i < totalHours; i++) {
        const line = h("div", { class: "cal-half-line" });
        line.style.top = `${i * HOUR_HEIGHT + HOUR_HEIGHT / 2}px`;
        col.appendChild(line);
      }
      return col;
    });
    const gridBody = h(
      "div",
      { class: "cal-grid" },
      timeLabels,
      ...dayColumns
    );
    function updateNowLine() {
      gridBody.querySelectorAll(".cal-now-line, .cal-now-dot").forEach((el) => el.remove());
      const now = /* @__PURE__ */ new Date();
      const ds = toDateStr(now);
      const col = gridBody.querySelector(`[data-date="${ds}"]`);
      if (!col) return;
      const mins = (now.getHours() - HOUR_START) * 60 + now.getMinutes();
      if (mins < 0 || mins > totalHours * 60) return;
      const top = mins / 60 * HOUR_HEIGHT;
      const dot = h("div", { class: "cal-now-dot" });
      const line = h("div", { class: "cal-now-line" });
      dot.style.top = line.style.top = `${top}px`;
      col.appendChild(dot);
      col.appendChild(line);
    }
    function renderEvents(eventsMap) {
      dayColumns.forEach((col, i) => {
        col.querySelectorAll(".cal-event").forEach((el) => el.remove());
        const ds = toDateStr(days[i]);
        const events = eventsMap[ds] || [];
        events.forEach((ev) => {
          const s = new Date(ev.start);
          const e = new Date(ev.end);
          const startMins = Math.max(0, (s.getHours() - HOUR_START) * 60 + s.getMinutes());
          const endMins = Math.min(totalHours * 60, (e.getHours() - HOUR_START) * 60 + e.getMinutes());
          if (endMins <= 0 || startMins >= totalHours * 60 || endMins <= startMins) return;
          const top = startMins / 60 * HOUR_HEIGHT;
          const height = Math.max(20, (endMins - startMins) / 60 * HOUR_HEIGHT - 2);
          const isFocus = (ev.title || "").startsWith("\u{1F3AF}");
          const el = h(
            "div",
            { class: `cal-event${isFocus ? " focus" : ""}` },
            h("div", { class: "cal-event-title" }, ev.title || "(no title)"),
            height > 32 ? h("div", { class: "cal-event-time" }, `${fmtTime(ev.start)} \u2013 ${fmtTime(ev.end)}`) : null
          );
          el.style.top = `${top}px`;
          el.style.height = `${height}px`;
          col.appendChild(el);
        });
      });
    }
    const loadingEl = h("div", { class: "cal-loading" }, "Loading calendar\u2026");
    async function loadAll() {
      if (!isAnyConnected()) return;
      scrollWrap.appendChild(loadingEl);
      const eventsMap = {};
      await Promise.all(days.map(async (d) => {
        const ds = toDateStr(d);
        try {
          eventsMap[ds] = await getEvents(ds);
        } catch {
          eventsMap[ds] = [];
        }
      }));
      loadingEl.remove();
      renderEvents(eventsMap);
    }
    const scrollWrap = h("div", { class: "cal-scroll" }, gridBody);
    setTimeout(() => {
      const now = /* @__PURE__ */ new Date();
      const mins = (now.getHours() - HOUR_START) * 60 + now.getMinutes();
      scrollWrap.scrollTop = Math.max(0, (mins > 30 ? mins / 60 - 1 : 0) * HOUR_HEIGHT);
    }, 0);
    updateNowLine();
    loadAll();
    const nowTimer = setInterval(updateNowLine, 6e4);
    const observer = new MutationObserver(() => {
      if (!document.body.contains(scrollWrap)) {
        clearInterval(nowTimer);
        observer.disconnect();
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
    return h(
      "div",
      { class: "cal-view" },
      header,
      dayHeaders,
      scrollWrap
    );
  }

  // src/js/render.js
  var _searchWasFocused = false;
  var _searchCaretPos = 0;
  function buildTopbar() {
    const searchInput = h("input", {
      class: "search-input",
      type: "text",
      placeholder: "Search tasks, notes\u2026",
      value: S.searchQuery || "",
      onFocus: () => {
        _searchWasFocused = true;
      },
      onBlur: () => {
        _searchWasFocused = false;
      },
      onInput: (e) => {
        _searchCaretPos = e.target.selectionStart;
        set({ searchQuery: e.target.value });
      },
      onKeydown: (e) => {
        if (e.key === "Escape") {
          _searchWasFocused = false;
          set({ searchQuery: "" });
        }
      }
    });
    const clearBtn = S.searchQuery ? h("button", { class: "search-clear", title: "Clear search", onClick: () => {
      _searchWasFocused = false;
      set({ searchQuery: "" });
    } }, "\xD7") : null;
    return h(
      "div",
      { class: "topbar" },
      h(
        "div",
        { class: "topbar-left" },
        h("button", { class: "sidebar-toggle", onClick: toggleSidebar, title: S.sidebarCollapsed ? "Show sidebar" : "Hide sidebar" }, "\u2261"),
        h("img", {
          class: "topbar-logo-img",
          src: S.theme === "dark" ? "dist/logo-dark.svg" : "dist/logo-light.svg",
          alt: "Focusboard",
          draggable: "false",
          onClick: gotoDashboard,
          style: { cursor: "pointer" }
        })
      ),
      h(
        "div",
        { class: "topbar-search" },
        h("span", { class: "search-icon" }, "\u2315"),
        searchInput,
        clearBtn
      ),
      h(
        "div",
        { class: "topbar-right" },
        h("button", { class: "btn", onClick: () => set({ showSettings: true }) }, "\u2699 Settings"),
        h("button", {
          class: `btn btn-primary${S.showAddItem ? " active" : ""}`,
          onClick: () => set({ showAddItem: !S.showAddItem, showAddCat: false })
        }, S.showAddItem ? "\u2715 Cancel" : "+ Add item")
      )
    );
  }
  function searchAllItems(query) {
    const q = query.toLowerCase().trim();
    if (!q) return { work: [], life: [] };
    const cats = {};
    ["work", "life"].forEach((panel) => {
      (S.data[panel]?.categories || []).forEach((c) => {
        cats[c.id] = c.name;
      });
    });
    const matches = (str) => str && str.toLowerCase().includes(q);
    const filterPanel = (panel) => (S.data[panel]?.items || []).filter((item) => {
      return matches(item.title) || matches(item.notes) || matches(item.waitingFrom) || matches(cats[item.categoryId]) || (item.tasks || []).some(
        (t) => matches(t.title) || matches(t.notes) || matches(t.subNature) || matches(t.waitingFrom)
      ) || (item.checklist || []).some((c) => matches(c.title));
    });
    return { work: filterPanel("work"), life: filterPanel("life") };
  }
  function buildSearchView() {
    const query = S.searchQuery.trim();
    const results = searchAllItems(query);
    const total = results.work.length + results.life.length;
    const frag = document.createDocumentFragment();
    frag.appendChild(h("div", { class: "panel-title" }, "Search results"));
    frag.appendChild(h(
      "div",
      { class: "panel-breadcrumb" },
      total ? `${total} result${total !== 1 ? "s" : ""} for "${query}"` : `No results for "${query}"`
    ));
    if (!total) {
      frag.appendChild(h("div", { class: "empty-state" }, "Try a different search term"));
      return frag;
    }
    if (results.work.length) {
      frag.appendChild(h("div", { class: "search-panel-label" }, `Work \xB7 ${results.work.length}`));
      frag.appendChild(renderSections(results.work, null));
    }
    if (results.life.length) {
      frag.appendChild(h("div", { class: "search-panel-label" }, `Life \xB7 ${results.life.length}`));
      frag.appendChild(renderSections(results.life, null));
    }
    return frag;
  }
  function buildPanelHeader() {
    const capitalize = (s) => s[0].toUpperCase() + s.slice(1);
    const title = S.view === "dashboard" ? `${capitalize(S.panel)} dashboard` : getActiveCatName();
    const children = [h("div", { class: "panel-title" }, title)];
    if (S.view === "workload") return [];
    if (S.view === "dashboard") {
      children.push(h("div", { class: "panel-breadcrumb" }, `All ${S.panel} tasks`));
      const tabs = [
        { v: "all", l: "All" },
        { v: "today", l: "Today" },
        { v: "week", l: "This week" }
      ];
      children.push(h(
        "div",
        { class: "dash-tab-row" },
        ...tabs.map(
          (t) => h("button", {
            class: `dash-tab${S.dashTab === t.v ? " active" : ""}`,
            onClick: () => set({ dashTab: t.v, dashFilter: null })
          }, t.l)
        )
      ));
    } else {
      const bc = h("div", { class: "panel-breadcrumb" });
      bc.innerHTML = `${capitalize(S.panel)} <span>/ ${getActiveCatName()}</span>`;
      children.push(bc);
    }
    if (S.view === "category") {
      const filters = ["all", "tasks", "workflows", "awaiting", "unscheduled"];
      children.push(h(
        "div",
        { class: "filter-row" },
        ...filters.map(
          (f) => h("button", {
            class: `filter-chip${S.filter === f ? " active" : ""}`,
            onClick: () => set({ filter: f })
          }, f[0].toUpperCase() + f.slice(1))
        )
      ));
    }
    return children;
  }
  function getDashboardGroups(items) {
    const tasks = items.filter((i) => i.type !== "workflow");
    const workflows = items.filter((i) => i.type === "workflow" && !i.done);
    const isWfTaskChaseDue = (t) => {
      if (!t || t.nature !== "waiting" || t.status !== "active") return false;
      if (t.chaseDate) return daysBefore(t.chaseDate) >= 0;
      const daysOut = t.waitingSince ? daysBefore(t.waitingSince) : 0;
      return daysOut >= (t.followUpDays || 5);
    };
    const hasActiveWaiting = (wf) => (wf.tasks || []).some((t) => t.status === "active" && t.nature === "waiting");
    const hasAnyChaseDue = (wf) => (wf.tasks || []).some(isWfTaskChaseDue);
    const awaitingWfs = workflows.filter(hasActiveWaiting);
    const isTaskChaseDue = (t) => t.nature === "waiting" && !t.done && !!t.chaseDate && daysBefore(t.chaseDate) >= 0;
    const waitingTasks = tasks.filter((t) => t.nature === "waiting" && !t.done);
    const actionTasks = tasks.filter((t) => t.nature !== "waiting");
    return {
      overdue: actionTasks.filter((i) => isOverdue(i.dueDate) && !i.done),
      dueToday: actionTasks.filter((i) => i.dueDate === TODAY && !isOverdue(i.dueDate) && !i.done),
      upcoming: actionTasks.filter((i) => i.dueDate && !isOverdue(i.dueDate) && i.dueDate !== TODAY && !i.done),
      chaseDue: [...awaitingWfs.filter(hasAnyChaseDue), ...waitingTasks.filter(isTaskChaseDue)],
      awaitingReply: [...awaitingWfs.filter((wf) => !hasAnyChaseDue(wf)), ...waitingTasks.filter((t) => !isTaskChaseDue(t))],
      completed: items.filter((i) => i.done)
    };
  }
  function buildDashboardSummary(groups) {
    const active = S.dashFilter;
    const stat = (key, count, label, sublabel, accent, urgent = false) => {
      const isActive = active === key;
      const card = h(
        "div",
        {
          class: `summary-card${urgent && count > 0 ? " summary-urgent" : ""}${isActive ? " summary-active" : ""}`,
          style: { borderTopColor: accent, cursor: "pointer" },
          onClick: () => set({ dashFilter: isActive ? null : key })
        },
        h("div", { class: "summary-count", style: { color: count > 0 ? accent : "var(--text4)" } }, String(count)),
        h("div", { class: "summary-label" }, label),
        sublabel ? h("div", { class: "summary-sub" }, sublabel) : null
      );
      return card;
    };
    return h(
      "div",
      { class: "summary-row" },
      stat("overdue", groups.overdue.length, "Overdue", "tasks", "#A32D2D", true),
      stat("dueToday", groups.dueToday.length, "Due today", "tasks", "#854F0B"),
      stat("upcoming", groups.upcoming.length, "Upcoming", "tasks", "#185FA5"),
      h("div", { class: "summary-divider" }),
      stat("chaseDue", groups.chaseDue.length, "Chase due", "items", "#A32D2D", true),
      stat("awaitingReply", groups.awaitingReply.length, "Awaiting reply", "items", "#378ADD"),
      stat("completed", groups.completed.length, "Completed", "all", "#1D9E75")
    );
  }
  var FILTER_LABELS = {
    overdue: "Overdue tasks",
    dueToday: "Due today",
    upcoming: "Upcoming tasks",
    chaseDue: "Chase due",
    awaitingReply: "Awaiting reply",
    completed: "Completed"
  };
  function buildCompletedDeck(doneItems) {
    if (!doneItems.length) return null;
    const isOpen = S.completedOpen;
    const toggle = h(
      "button",
      {
        class: "completed-deck-toggle",
        onClick: () => set({ completedOpen: !S.completedOpen })
      },
      h("span", { class: "completed-deck-chevron" }, isOpen ? "\u25B2" : "\u25BC"),
      `Completed \xB7 ${doneItems.length}`
    );
    const deck = h("div", { class: `completed-deck${isOpen ? " open" : ""}` });
    if (isOpen) {
      doneItems.forEach((item) => {
        deck.appendChild(renderSections([item], item.categoryId));
      });
    }
    return h("div", { class: "completed-section" }, toggle, deck);
  }
  var SUMMARY_PERIODS = [
    { v: "today", l: "Today" },
    { v: "week", l: "This week" },
    { v: "month", l: "This month" },
    { v: "quarter", l: "Last 3 months" },
    { v: "half", l: "Last 6 months" },
    { v: "year", l: "Last year" },
    { v: "2year", l: "Last 2 years" },
    { v: "all", l: "All time" }
  ];
  function getPeriodStart(period) {
    if (period === "all") return "0000-00-00";
    const d = /* @__PURE__ */ new Date();
    if (period === "today") return TODAY;
    if (period === "week") {
      d.setDate(d.getDate() - (d.getDay() + 6) % 7);
    }
    if (period === "month") {
      d.setDate(1);
    }
    if (period === "quarter") {
      d.setMonth(d.getMonth() - 3);
    }
    if (period === "half") {
      d.setMonth(d.getMonth() - 6);
    }
    if (period === "year") {
      d.setFullYear(d.getFullYear() - 1);
    }
    if (period === "2year") {
      d.setFullYear(d.getFullYear() - 2);
    }
    return d.toISOString().split("T")[0];
  }
  function buildWorkloadView() {
    const allItems = [
      ...(S.data.work?.items || []).map((i) => ({ ...i, _panel: "work" })),
      ...(S.data.life?.items || []).map((i) => ({ ...i, _panel: "life" }))
    ];
    const period = S.workloadPeriod || "week";
    const start = getPeriodStart(period);
    const doneAll = allItems.filter((i) => i.done);
    const donePeriod = period === "today" ? doneAll.filter((i) => i.doneDate === TODAY) : doneAll.filter((i) => (i.doneDate || "9999") >= start);
    const frag = document.createDocumentFragment();
    const headerRow = h(
      "div",
      { class: "summary-header-row" },
      h(
        "div",
        {},
        h("div", { class: "panel-title" }, "Summary"),
        h("div", { class: "panel-breadcrumb" }, "Completed work overview")
      ),
      h(
        "div",
        { class: "summary-period-wrap" },
        customSelect(SUMMARY_PERIODS, period, (v) => set({ workloadPeriod: v }))
      )
    );
    frag.appendChild(headerRow);
    const tasksDone = donePeriod.filter((i) => i.type !== "workflow").length;
    const wfDone = donePeriod.filter((i) => i.type === "workflow").length;
    frag.appendChild(h(
      "div",
      { class: "workload-stats" },
      h(
        "div",
        { class: "workload-stat" },
        h("div", { class: "workload-stat-value" }, String(tasksDone)),
        h("div", { class: "workload-stat-label" }, "Tasks completed")
      ),
      h(
        "div",
        { class: "workload-stat" },
        h("div", { class: "workload-stat-value" }, String(wfDone)),
        h("div", { class: "workload-stat-label" }, "Workflows closed")
      )
    ));
    if (!donePeriod.length) {
      frag.appendChild(h("div", { class: "empty-state" }, "Nothing completed in this period yet"));
    } else {
      const workDone = donePeriod.filter((i) => i._panel === "work");
      const lifeDone = donePeriod.filter((i) => i._panel === "life");
      if (workDone.length) {
        frag.appendChild(h("div", { class: "search-panel-label" }, `Work \xB7 ${workDone.length}`));
        frag.appendChild(renderSections(workDone, null));
      }
      if (lifeDone.length) {
        frag.appendChild(h("div", { class: "search-panel-label" }, `Life \xB7 ${lifeDone.length}`));
        frag.appendChild(renderSections(lifeDone, null));
      }
    }
    return frag;
  }
  function getWeekStart() {
    const d = /* @__PURE__ */ new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - (d.getDay() + 6) % 7);
    return d.toISOString().split("T")[0];
  }
  function getWeekEnd() {
    const d = /* @__PURE__ */ new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + (6 - (d.getDay() + 6) % 7));
    return d.toISOString().split("T")[0];
  }
  function buildTodayContent(frag) {
    const todayAbbr = (/* @__PURE__ */ new Date()).toLocaleDateString("en-GB", { weekday: "short" });
    const allItems = [...S.data.work?.items || [], ...S.data.life?.items || []];
    const isTodaySession = (s) => s.date === TODAY || !s.date && s.day === todayAbbr;
    const todaySessions = [];
    allItems.forEach((item) => {
      if (item.done) return;
      const sessions = item.focusSessions?.length ? item.focusSessions : item.focusBlock ? [item.focusBlock] : [];
      sessions.forEach((s) => {
        if (isTodaySession(s)) todaySessions.push({ ...s, itemTitle: item.title });
      });
    });
    todaySessions.sort((a, b) => (a.start || "").localeCompare(b.start || ""));
    if (todaySessions.length) {
      frag.appendChild(h("div", { class: "group-label" }, `Focus schedule \xB7 ${todaySessions.length} block${todaySessions.length !== 1 ? "s" : ""}`));
      const scheduleEl = h("div", { class: "today-schedule" });
      todaySessions.forEach((s) => scheduleEl.appendChild(h(
        "div",
        { class: "today-block" },
        h("div", { class: "today-block-time" }, `${s.start} \u2013 ${s.end}`),
        h("div", { class: "today-block-title" }, s.itemTitle)
      )));
      frag.appendChild(scheduleEl);
    }
    const panelItems = getPanelData().items;
    const focusedIds = new Set(
      allItems.filter((i) => !i.done && (i.focusSessions?.some(isTodaySession) || i.focusBlock && isTodaySession(i.focusBlock))).map((i) => i.id)
    );
    const actionItems = panelItems.filter((i) => i.type !== "workflow" && i.nature !== "waiting");
    const workflowItems = panelItems.filter((i) => {
      if (i.type !== "workflow" || i.done) return false;
      if (i.hasDueDate && i.dueDate && (i.dueDate === TODAY || isOverdue(i.dueDate))) return true;
      return (i.tasks || []).some((t) => t.status === "active" && (t.dueDate === TODAY || isOverdue(t.dueDate)));
    });
    const overdue = [
      ...actionItems.filter((i) => !i.done && isOverdue(i.dueDate)),
      ...workflowItems.filter((i) => isOverdue(i.dueDate) || (i.tasks || []).some((t) => t.status === "active" && isOverdue(t.dueDate)))
    ];
    const dueToday = [
      ...actionItems.filter((i) => !i.done && i.dueDate === TODAY && !isOverdue(i.dueDate)),
      ...workflowItems.filter((i) => !isOverdue(i.dueDate) && (i.dueDate === TODAY || (i.tasks || []).some((t) => t.status === "active" && t.dueDate === TODAY)))
    ];
    const shownIds = new Set([...overdue, ...dueToday].map((i) => i.id));
    const focusOnly = panelItems.filter((i) => focusedIds.has(i.id) && !shownIds.has(i.id));
    const hasWork = overdue.length || dueToday.length || focusOnly.length;
    if (!hasWork && !todaySessions.length) {
      frag.appendChild(h(
        "div",
        { class: "today-clear" },
        h("div", { class: "today-clear-icon" }, "\u2713"),
        h("div", { class: "today-clear-text" }, "You're all clear for today")
      ));
    } else {
      if (overdue.length) {
        frag.appendChild(h("div", { class: "group-label today-overdue-label" }, `Overdue \xB7 ${overdue.length}`));
        frag.appendChild(renderSections(overdue, null, { hideDone: true }));
      }
      if (dueToday.length) {
        frag.appendChild(h("div", { class: "group-label" }, `Due today \xB7 ${dueToday.length}`));
        frag.appendChild(renderSections(dueToday, null, { hideDone: true }));
      }
      if (focusOnly.length) {
        frag.appendChild(h("div", { class: "group-label" }, `Scheduled focus \xB7 ${focusOnly.length}`));
        frag.appendChild(renderSections(focusOnly, null, { hideDone: true }));
      }
    }
  }
  function buildWeekContent(frag) {
    const weekStart = getWeekStart();
    const weekEnd = getWeekEnd();
    const allItems = [...S.data.work?.items || [], ...S.data.life?.items || []];
    const isWeekSession = (s) => s.date && s.date >= weekStart && s.date <= weekEnd;
    const focusedWeekIds = new Set(
      allItems.filter((i) => !i.done && (i.focusSessions?.some(isWeekSession) || i.focusBlock && isWeekSession(i.focusBlock))).map((i) => i.id)
    );
    const panelItems = getPanelData().items;
    const actionItems = panelItems.filter((i) => i.type !== "workflow" && i.nature !== "waiting");
    const workflowItems = panelItems.filter((i) => i.type === "workflow" && !i.done && (i.hasDueDate && i.dueDate >= weekStart && i.dueDate <= weekEnd || (i.tasks || []).some((t) => t.status === "active" && t.dueDate >= weekStart && t.dueDate <= weekEnd)));
    const overdue = [
      ...actionItems.filter((i) => !i.done && isOverdue(i.dueDate)),
      ...panelItems.filter((i) => i.type === "workflow" && !i.done && (isOverdue(i.dueDate) || (i.tasks || []).some((t) => t.status === "active" && isOverdue(t.dueDate))))
    ];
    const dueToday = [
      ...actionItems.filter((i) => !i.done && i.dueDate === TODAY),
      ...workflowItems.filter((i) => i.dueDate === TODAY || (i.tasks || []).some((t) => t.status === "active" && t.dueDate === TODAY))
    ];
    const dueWeek = [
      ...actionItems.filter((i) => !i.done && i.dueDate > TODAY && i.dueDate <= weekEnd),
      ...workflowItems.filter((i) => !dueToday.find((d) => d.id === i.id) && !overdue.find((o) => o.id === i.id))
    ];
    const shownIds = new Set([...overdue, ...dueToday, ...dueWeek].map((i) => i.id));
    const focusOnly = panelItems.filter((i) => focusedWeekIds.has(i.id) && !shownIds.has(i.id));
    const hasWork = overdue.length || dueToday.length || dueWeek.length || focusOnly.length;
    if (!hasWork) {
      frag.appendChild(h(
        "div",
        { class: "today-clear" },
        h("div", { class: "today-clear-icon" }, "\u2713"),
        h("div", { class: "today-clear-text" }, "Nothing due or scheduled this week")
      ));
      return;
    }
    if (overdue.length) {
      frag.appendChild(h("div", { class: "group-label today-overdue-label" }, `Overdue \xB7 ${overdue.length}`));
      frag.appendChild(renderSections(overdue, null, { hideDone: true }));
    }
    if (dueToday.length) {
      frag.appendChild(h("div", { class: "group-label" }, `Due today \xB7 ${dueToday.length}`));
      frag.appendChild(renderSections(dueToday, null, { hideDone: true }));
    }
    if (dueWeek.length) {
      frag.appendChild(h("div", { class: "group-label" }, `Due this week \xB7 ${dueWeek.length}`));
      frag.appendChild(renderSections(dueWeek, null, { hideDone: true }));
    }
    if (focusOnly.length) {
      frag.appendChild(h("div", { class: "group-label" }, `Scheduled focus \xB7 ${focusOnly.length}`));
      frag.appendChild(renderSections(focusOnly, null, { hideDone: true }));
    }
  }
  function buildDashboard() {
    const items = getPanelData().items;
    const groups = getDashboardGroups(items);
    if (!items.length) {
      return [h("div", { class: "empty-state" }, "No tasks yet \u2014 click + Add item to get started")];
    }
    const frag = document.createDocumentFragment();
    const tab = S.dashTab || "all";
    if (tab === "today") {
      buildTodayContent(frag);
      return [frag];
    }
    if (tab === "week") {
      buildWeekContent(frag);
      return [frag];
    }
    frag.appendChild(buildDashboardSummary(groups));
    const f = S.dashFilter;
    if (f === "completed") {
      frag.appendChild(h(
        "div",
        { class: "dash-filter-bar" },
        h("span", { class: "dash-filter-label" }, FILTER_LABELS[f]),
        h("button", { class: "dash-filter-clear", onClick: () => set({ dashFilter: null }) }, "\u2715 Show all")
      ));
      frag.appendChild(groups.completed.length ? renderSections(groups.completed, null) : h("div", { class: "empty-state" }, "Nothing here"));
    } else if (f) {
      const filtered = groups[f] || [];
      frag.appendChild(h(
        "div",
        { class: "dash-filter-bar" },
        h("span", { class: "dash-filter-label" }, FILTER_LABELS[f]),
        h("button", { class: "dash-filter-clear", onClick: () => set({ dashFilter: null }) }, "\u2715 Show all")
      ));
      frag.appendChild(filtered.length ? renderSections(filtered, null, { hideDone: true }) : h("div", { class: "empty-state" }, "Nothing here"));
    } else {
      frag.appendChild(renderSections(items, null, { hideDone: true }));
      const deck = buildCompletedDeck(groups.completed);
      if (deck) frag.appendChild(deck);
    }
    return [frag];
  }
  function buildCategoryView() {
    const items = getFilteredItems();
    if (!items.length) return [h("div", { class: "empty-state" }, "No items here")];
    const done = items.filter((i) => i.done);
    const frag = document.createDocumentFragment();
    frag.appendChild(renderSections(items, S.activeCat, { hideDone: true }));
    const deck = buildCompletedDeck(done);
    if (deck) frag.appendChild(deck);
    return [frag];
  }
  function buildFocusBlocksView() {
    const allItems = [
      ...S.data.work?.items || [],
      ...S.data.life?.items || []
    ].filter((i) => i.focusBlock && !i.done);
    const title = h("div", { class: "panel-title" }, "Focus blocks");
    const sub = h("div", { class: "panel-breadcrumb" }, "All scheduled focus time");
    if (!allItems.length) {
      return h(
        "div",
        {},
        title,
        sub,
        h("div", { class: "empty-state" }, 'No focus blocks scheduled yet \u2014 open a task and click "Suggest focus block"')
      );
    }
    const rows = allItems.map(
      (item) => h(
        "div",
        { class: "focus-block-row" },
        h("div", { class: "fb-time" }, `${item.focusBlock.day} ${item.focusBlock.start} \u2013 ${item.focusBlock.end}`),
        h("div", { class: "fb-title" }, item.title),
        h("div", { class: "fb-panel" }, item.categoryId ? "" : "")
      )
    );
    return h("div", {}, title, sub, h("div", { class: "focus-block-list" }, ...rows));
  }
  function render() {
    if (!isAuthenticated()) {
      document.body.className = S.theme;
      const existing = document.getElementById("app");
      if (existing) existing.innerHTML = "";
      const target = existing || document.body;
      target.innerHTML = "";
      target.appendChild(buildPasswordGate(() => render()));
      return;
    }
    document.body.className = S.theme;
    const app = document.getElementById("app");
    app.innerHTML = "";
    app.appendChild(buildTopbar());
    const main = h("div", { class: "main" });
    main.appendChild(buildSidebar());
    const taskPanel = h("div", { class: S.view === "calendar" ? "task-panel cal-panel" : "task-panel" });
    if (S.searchQuery.trim()) {
      const sf = buildSearchView();
      taskPanel.appendChild(sf);
    } else if (S.view === "workload") {
      taskPanel.appendChild(buildWorkloadView());
    } else if (S.view === "calendar") {
      taskPanel.appendChild(buildCalendarView());
    } else if (S.view === "focus") {
      taskPanel.appendChild(buildFocusBlocksView());
    } else {
      if (S.showAddItem) taskPanel.appendChild(buildAddForm());
      buildPanelHeader().forEach((el) => taskPanel.appendChild(el));
      const content = S.view === "dashboard" ? buildDashboard() : buildCategoryView();
      content.forEach((el) => taskPanel.appendChild(el));
    }
    main.appendChild(taskPanel);
    app.appendChild(main);
    if (S.showSettings) app.appendChild(buildSettings());
    if (_searchWasFocused) {
      const inp = document.querySelector(".search-input");
      if (inp) {
        inp.focus();
        inp.setSelectionRange(_searchCaretPos, _searchCaretPos);
      }
    }
  }
  document.body.className = S.theme;
  setRenderFn(render);
  render();
  loadCalFreeMinutes();
})();
