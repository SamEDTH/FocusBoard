export const STORAGE_KEY = 'focusboard-v3';
export const SETTINGS_KEY = 'focusboard-settings';
export const TODAY = new Date().toISOString().split('T')[0];

export const DEFAULT = {
  work: {
    categories: [
      { id: 'acme', name: 'Acme Co' },
      { id: 'board', name: 'Board prep' },
      { id: 'finance', name: 'Finance' },
      { id: 'misc', name: 'Misc' },
    ],
    items: [
      {
        id: 'w1', type: 'workflow', title: 'Consultant document review',
        categoryId: 'acme', priority: 'urgent', dueDate: '2026-04-11', timeNeeded: 120,
        stage: 'awaiting', stageSentDate: '2026-04-10', followUpDays: 5,
        notes: 'Chase Tom directly if no response by Wed.',
        stages: [
          { id: 's1', label: 'Document reviewed internally', date: '2026-04-08' },
          { id: 's2', label: 'Queries sent to consultant', date: '2026-04-10' },
        ],
        done: false,
      },
      {
        id: 'w2', type: 'task', title: 'Respond to client proposal',
        categoryId: 'acme', priority: 'urgent', dueDate: TODAY, timeNeeded: 60,
        focusBlock: { day: 'Today', start: '10:00', end: '11:00' },
        notes: 'CC Sarah on reply.', done: false,
      },
      {
        id: 'w3', type: 'task', title: 'Send contract to Acme',
        categoryId: 'acme', priority: 'medium', dueDate: TODAY, timeNeeded: 30,
        notes: '', done: true, doneAt: '9:15am',
      },
      {
        id: 'w4', type: 'task', title: 'Prepare slides for board meeting',
        categoryId: 'board', priority: 'urgent', dueDate: '2026-04-16', timeNeeded: 180,
        focusBlock: { day: 'Wed', start: '11:00', end: '14:00' },
        notes: '', done: false,
      },
      {
        id: 'w5', type: 'task', title: 'Compile board pack supporting docs',
        categoryId: 'board', priority: 'medium', dueDate: '2026-04-15', timeNeeded: 60,
        notes: '', done: false,
      },
      {
        id: 'w6', type: 'task', title: 'Review Q1 budget report',
        categoryId: 'finance', priority: 'urgent', dueDate: '2026-04-11', timeNeeded: 120,
        notes: 'Flag variances over 10%.', done: false,
      },
    ],
  },
  life: {
    categories: [
      { id: 'home', name: 'Home' },
      { id: 'health', name: 'Health' },
      { id: 'misc-life', name: 'Misc' },
    ],
    items: [
      {
        id: 'l1', type: 'task', title: 'Book boiler service',
        categoryId: 'home', priority: 'medium', dueDate: '2026-04-20', timeNeeded: 15,
        notes: '', done: false,
      },
      {
        id: 'l2', type: 'task', title: 'Book dentist appointment',
        categoryId: 'health', priority: 'medium', dueDate: '2026-04-18', timeNeeded: 15,
        notes: '', done: false,
      },
    ],
  },
};
