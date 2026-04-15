# FocusBoard

A personal task and workflow manager built for clarity — designed to surface what actually needs doing next, not just what's on the list.

## Features

**Smart priority system**
- Manual or auto-computed priority based on due date, time needed, and urgency
- Priority competition — when everything is low priority, tasks are scaled relative to each other so there's always a clear "next action"
- Calendar integration: tasks that consume a large portion of your available free time today are flagged with a time-pressure indicator

**Workflows**
- Multi-step workflows with send/waiting/chase task chains
- Automatic chase scheduling with target return dates
- Per-task checklists inside workflows

**Tasks**
- Checklist subtasks (completing all does not auto-complete the parent — intentional)
- Focus block booking direct to Google Calendar or Outlook
- Split booking for long tasks across multiple sessions

**Dashboard**
- At-a-glance counters: overdue, due today, upcoming, awaiting reply, chase due
- Per-category views with drag-and-drop reordering

**Calendar view**
- Week view synced to Google Calendar or Microsoft Outlook
- Today's meetings and focus blocks shown in context

**Other**
- Dark mode / system theme follow
- Fully local — all data stored in `localStorage`, no backend required

## Tech stack

Vanilla JS (no framework), esbuild, CSS custom properties. No dependencies at runtime.

## Getting started

```bash
npm install
npm run build
```

Open `index.html` directly in a browser, or serve it:

```bash
npm run dev   # serves at localhost:3000
```

To rebuild automatically as you edit:

```bash
npm run watch
```

## Calendar setup

Connect Google Calendar or Microsoft Outlook in **Settings** using an OAuth 2.0 Client ID. The app uses a PKCE flow — no backend or client secret required for Outlook; Google requires a client secret for the token exchange.

- **Google**: [console.cloud.google.com](https://console.cloud.google.com) → Enable Calendar API → OAuth 2.0 Client (Web app), set origin to your localhost or deployed URL
- **Outlook**: [portal.azure.com](https://portal.azure.com) → App registrations → SPA, redirect URI set to your origin
