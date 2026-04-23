export const STORAGE_KEY = 'focusboard-v3';
export const SETTINGS_KEY = 'focusboard-settings';
export const TODAY = new Date().toISOString().split('T')[0];

// ── Template data helpers ─────────────────────────────────────────────────────
// These run once at module load. They ensure demo dates are always relative to
// the current day, so the template never looks stale regardless of when the
// app is first opened. DEFAULT is never mutated — user data lives in
// localStorage exclusively; this object exists only as a factory for new installs.

const D = n => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().split('T')[0];
};

// ISO timestamp for a time on a given day offset (local timezone)
const T = (dayOffset, h, m) => {
  const d = new Date();
  d.setDate(d.getDate() + dayOffset);
  d.setHours(h, m, 0, 0);
  return d.toISOString();
};

const HH = n => String(n).padStart(2, '0');
const hhmm = (h, m) => `${HH(h)}:${HH(m)}`;
const dayLabel = n => {
  if (n === 0) return 'Today';
  if (n === 1) return 'Tomorrow';
  return new Date(D(n) + 'T00:00:00').toLocaleDateString('en-GB', { weekday: 'short' });
};

// ── Template data ─────────────────────────────────────────────────────────────

export const DEFAULT = {
  work: {
    categories: [
      { id: 'clients',  name: 'Project 1' },
      { id: 'internal', name: 'Project 2' },
      { id: 'finance',  name: 'Project 3' },
      { id: 'bizdev',   name: 'Project 4' },
    ],
    items: [

      // ── Clients ─────────────────────────────────────────────────────────────

      // Workflow: contract renewal with a send/waiting chain (chase is due)
      {
        id: 'demo-wf1',
        type: 'workflow',
        title: 'Apex Partners — contract renewal',
        categoryId: 'clients',
        hasDueDate: true,
        dueDate: D(14),
        notes: 'Key account — handle personally. Target for a 3-year term.',
        done: false,
        tasks: [
          {
            id: 'demo-wf1-t1',
            title: 'Review existing contract terms',
            nature: 'todo',
            status: 'done',
            timeNeeded: 45,
          },
          {
            id: 'demo-wf1-t2',
            title: 'Send renewal proposal',
            nature: 'send',
            status: 'done',
            isChase: false,
          },
          {
            // Chase is overdue → shows in "Chase due" dashboard counter
            id: 'demo-wf1-t3',
            title: 'Awaiting approval — Apex Partners',
            nature: 'waiting',
            status: 'active',
            waitingSince: D(-5),
            waitingFrom: 'Sarah Chen, Apex Partners',
            targetReturnDate: D(7),
            chaseDate: D(-1),
          },
          {
            id: 'demo-wf1-t4',
            title: 'Prepare final contract for signing',
            nature: 'todo',
            status: 'active',
            timeNeeded: 60,
            dueDate: D(9),
          },
          {
            id: 'demo-wf1-t5',
            title: 'Send signed contract to Apex',
            nature: 'send',
            status: 'active',
            isChase: false,
          },
        ],
      },

      // Workflow: NDA in progress — awaiting reply, chase not yet due
      {
        id: 'demo-wf2',
        type: 'workflow',
        title: 'Willow Tech — NDA & initial scoping',
        categoryId: 'clients',
        hasDueDate: true,
        dueDate: D(21),
        notes: 'Warm intro via James. Potential 6-figure engagement.',
        done: false,
        tasks: [
          {
            id: 'demo-wf2-t1',
            title: 'Send NDA for countersignature',
            nature: 'send',
            status: 'done',
            isChase: false,
          },
          {
            // Chase not yet due → shows in "Awaiting reply" dashboard counter
            id: 'demo-wf2-t2',
            title: 'Awaiting signed NDA — Willow Tech',
            nature: 'waiting',
            status: 'active',
            waitingSince: D(-2),
            waitingFrom: 'Marcus Webb, Willow Tech',
            targetReturnDate: D(5),
            chaseDate: D(4),
          },
          {
            id: 'demo-wf2-t3',
            title: 'Schedule discovery call',
            nature: 'todo',
            status: 'active',
            timeNeeded: 20,
          },
          {
            id: 'demo-wf2-t4',
            title: 'Send scoping questionnaire',
            nature: 'send',
            status: 'active',
            isChase: false,
          },
        ],
      },

      // Task: due today, focus block booked, checklist
      {
        id: 'demo-t1',
        type: 'task',
        title: 'Draft response to Meridian pricing query',
        categoryId: 'clients',
        dueDate: D(0),
        timeNeeded: 45,
        notes: 'They are comparing us against two others. Emphasise onboarding support.',
        done: false,
        checklist: [
          { id: 'demo-t1-c1', title: 'Pull previous pricing correspondence', done: true },
          { id: 'demo-t1-c2', title: 'Confirm current rate card with finance', done: false },
          { id: 'demo-t1-c3', title: 'Draft and send reply', done: false },
        ],
        focusSessions: [{
          day:      dayLabel(0),
          date:     D(0),
          start:    hhmm(14, 0),
          end:      hhmm(14, 45),
          startISO: T(0, 14, 0),
          endISO:   T(0, 14, 45),
        }],
      },

      // Task: completed (shows in Completed count)
      {
        id: 'demo-t2',
        type: 'task',
        title: 'Send Meridian onboarding pack',
        categoryId: 'clients',
        dueDate: D(-1),
        timeNeeded: 20,
        notes: '',
        done: true,
        doneAt: '09:15',
      },

      // ── Internal ─────────────────────────────────────────────────────────────

      // Task: big time commitment, focus block booked tomorrow
      {
        id: 'demo-t3',
        type: 'task',
        title: 'Prepare Q2 board presentation',
        categoryId: 'internal',
        dueDate: D(3),
        timeNeeded: 180,
        notes: 'Focus on pipeline conversion and headcount plan. Keep slides under 12.',
        done: false,
        checklist: [
          { id: 'demo-t3-c1', title: 'Pull Q2 pipeline data from CRM',        done: true  },
          { id: 'demo-t3-c2', title: 'Draft key metrics slide',                done: true  },
          { id: 'demo-t3-c3', title: 'Add headcount and cost projections',     done: false },
          { id: 'demo-t3-c4', title: 'Review deck with CFO',                   done: false },
          { id: 'demo-t3-c5', title: 'Send to board members 24h in advance',   done: false },
        ],
        focusSessions: [{
          day:      dayLabel(1),
          date:     D(1),
          start:    hhmm(9, 0),
          end:      hhmm(11, 30),
          startISO: T(1, 9, 0),
          endISO:   T(1, 11, 30),
        }],
      },

      // Workflow: quarterly planning cycle
      {
        id: 'demo-wf3',
        type: 'workflow',
        title: 'Q3 planning cycle',
        categoryId: 'internal',
        hasDueDate: true,
        dueDate: D(30),
        notes: 'Get buy-in from each team lead before the all-hands.',
        done: false,
        tasks: [
          {
            id: 'demo-wf3-t1',
            title: 'Gather headcount forecasts from team leads',
            nature: 'todo',
            status: 'active',
            timeNeeded: 30,
            dueDate: D(7),
            checklist: [
              { id: 'demo-wf3-t1-c1', title: 'Sales team', done: false },
              { id: 'demo-wf3-t1-c2', title: 'Engineering team', done: false },
              { id: 'demo-wf3-t1-c3', title: 'Operations team', done: false },
            ],
          },
          {
            id: 'demo-wf3-t2',
            title: 'Draft budget proposal',
            nature: 'todo',
            status: 'active',
            timeNeeded: 120,
            dueDate: D(14),
          },
          {
            id: 'demo-wf3-t3',
            title: 'Circulate draft to leadership for comment',
            nature: 'send',
            status: 'active',
            isChase: false,
          },
        ],
      },

      // ── Finance ──────────────────────────────────────────────────────────────

      {
        id: 'demo-t4',
        type: 'task',
        title: 'Review monthly management accounts',
        categoryId: 'finance',
        dueDate: D(2),
        timeNeeded: 90,
        notes: 'Flag any variance above 10% for the board pack. Check payroll line carefully.',
        done: false,
      },

      {
        id: 'demo-t5',
        type: 'task',
        title: 'Submit Q1 expense claims',
        categoryId: 'finance',
        dueDate: D(5),
        timeNeeded: 20,
        notes: '',
        done: false,
        checklist: [
          { id: 'demo-t5-c1', title: 'Gather all receipts',              done: true  },
          { id: 'demo-t5-c2', title: 'Complete expense report',          done: false },
          { id: 'demo-t5-c3', title: 'Get line manager approval',        done: false },
          { id: 'demo-t5-c4', title: 'Submit via finance portal',        done: false },
        ],
      },

      // ── Business dev ─────────────────────────────────────────────────────────

      {
        id: 'demo-t6',
        type: 'task',
        title: 'Respond to inbound partnership enquiry',
        categoryId: 'bizdev',
        dueDate: D(1),
        timeNeeded: 45,
        notes: 'Came via website form. Looks like a strong fit for the enterprise tier — escalate if interested.',
        done: false,
      },

      // Workflow: tender submission
      {
        id: 'demo-wf4',
        type: 'workflow',
        title: 'Brightside Group — tender response',
        categoryId: 'bizdev',
        hasDueDate: true,
        dueDate: D(20),
        notes: 'High value — worth investing proper time. Loop in pre-sales support.',
        done: false,
        tasks: [
          {
            id: 'demo-wf4-t1',
            title: 'Review tender documents thoroughly',
            nature: 'todo',
            status: 'active',
            timeNeeded: 120,
            dueDate: D(5),
          },
          {
            id: 'demo-wf4-t2',
            title: 'Draft tender response',
            nature: 'todo',
            status: 'active',
            timeNeeded: 240,
            dueDate: D(14),
          },
          {
            id: 'demo-wf4-t3',
            title: 'Submit tender response',
            nature: 'send',
            status: 'active',
            isChase: false,
          },
        ],
      },
    ],
  },

  life: {
    categories: [
      { id: 'home',     name: 'Home'     },
      { id: 'health',   name: 'Health'   },
      { id: 'personal', name: 'Personal' },
    ],
    items: [
      {
        id: 'demo-l1',
        type: 'task',
        title: 'Book annual boiler service',
        categoryId: 'home',
        dueDate: D(14),
        timeNeeded: 15,
        notes: '',
        done: false,
        checklist: [
          { id: 'demo-l1-c1', title: 'Find last service certificate', done: false },
          { id: 'demo-l1-c2', title: 'Call to book appointment',      done: false },
        ],
      },
      {
        id: 'demo-l2',
        type: 'task',
        title: 'Sort contents insurance renewal',
        categoryId: 'home',
        dueDate: D(6),
        timeNeeded: 30,
        notes: 'Policy expires end of month. Check comparison sites before renewing direct.',
        done: false,
      },
      {
        id: 'demo-l3',
        type: 'task',
        title: 'Book GP annual check-up',
        categoryId: 'health',
        dueDate: D(21),
        timeNeeded: 15,
        notes: '',
        done: false,
      },
      {
        id: 'demo-l4',
        type: 'task',
        title: 'Renew gym membership',
        categoryId: 'health',
        dueDate: D(7),
        timeNeeded: 10,
        notes: '',
        done: false,
      },
      {
        id: 'demo-l5',
        type: 'task',
        title: 'File self-assessment tax return',
        categoryId: 'personal',
        dueDate: D(30),
        timeNeeded: 120,
        notes: 'Remember the interest income from the savings account this year.',
        done: false,
        checklist: [
          { id: 'demo-l5-c1', title: 'Gather P60 and bank statements', done: false },
          { id: 'demo-l5-c2', title: 'Log in to HMRC portal',          done: false },
          { id: 'demo-l5-c3', title: 'Complete and submit return',      done: false },
          { id: 'demo-l5-c4', title: 'Make payment if owed',           done: false },
        ],
      },
    ],
  },
};
