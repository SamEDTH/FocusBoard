import { TODAY } from './constants.js';

/**
 * Auto-compute chase date: today + followUpDays.
 * Returns '' if that date is on or after the targetReturnDate (no point chasing
 * if the return is due before or at the same time as the follow-up).
 */
export function computeChaseDate(targetReturnDate, followUpDays) {
  if (!followUpDays) return '';
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const chase = new Date(today);
  chase.setDate(chase.getDate() + followUpDays);
  if (targetReturnDate) {
    const ret = new Date(targetReturnDate); ret.setHours(0, 0, 0, 0);
    if (chase >= ret) return '';
  }
  return chase.toISOString().split('T')[0];
}

/** Number of days between today and a date string (positive = past/overdue). */
export function daysBefore(dateStr) {
  if (!dateStr) return null;
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const d = new Date(dateStr);
  d.setHours(0, 0, 0, 0);
  return Math.floor((now - d) / 86400000);
}

/** Format a date string as "12 Apr 2026". */
export function formatDate(dateStr) {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

/** Format due date relative to today ("Due today", "Overdue — 11 Apr", "Due 15 Apr"). */
export function formatDue(dateStr) {
  if (!dateStr) return '';
  const days = daysBefore(dateStr);
  const dt = new Date(dateStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
  if (days === 0) return 'Due today';
  if (days > 0) return `Overdue — ${dt}`;
  return `Due ${dt}`;
}

/** Returns true if the date is in the past and not today. */
export function isOverdue(dateStr) {
  return daysBefore(dateStr) > 0;
}

/** Format minutes as "1h 30m", "2h", "45m". */
export function formatTime(minutes) {
  if (!minutes) return '';
  if (minutes >= 60) {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return m ? `${h}h ${m}m` : `${h}h`;
  }
  return `${minutes}m`;
}

/** Capitalise first letter of a string. */
export function capitalize(str) {
  return str ? str[0].toUpperCase() + str.slice(1) : '';
}

// ── Priority: 1 (low/green) → 10 (urgent/red) ────────────────────────────────

const PRIORITY_COLORS = [
  '#1D9E75', // 1 – green
  '#4CAF6A', // 2
  '#7BBF44', // 3
  '#AAC928', // 4
  '#CEC212', // 5 – yellow
  '#F0A500', // 6 – amber
  '#E07820', // 7 – orange
  '#D04A10', // 8
  '#C02808', // 9
  '#A32D2D', // 10 – red
];

/** Hex colour for a 1–10 priority value. */
export function getPriorityColor(p) {
  return PRIORITY_COLORS[Math.max(0, Math.min(9, (p || 1) - 1))];
}

/**
 * Migrate old string priority to a number.
 * New items store numbers; legacy items may still store 'urgent'|'medium'|'low'.
 */
export function normalizePriority(p) {
  if (typeof p === 'number') return Math.max(1, Math.min(10, Math.round(p)));
  if (p === 'urgent') return 8;
  if (p === 'medium') return 5;
  if (p === 'low')    return 2;
  return 5;
}

/**
 * Compute a task's effective priority (1–10) from time needed vs time remaining.
 * Deadline = 5pm on the due date.
 * ratio = timeNeeded / hoursUntil5pm, clamped to [1, 10].
 * Falls back to the stored (normalised) priority if date/time data is missing.
 */
export function computePriority(item) {
  if (!item.dueDate || !item.timeNeeded) return normalizePriority(item.priority);

  const deadline = new Date(item.dueDate);
  deadline.setHours(17, 0, 0, 0);

  const hoursRemaining = (deadline - new Date()) / 3_600_000;

  if (hoursRemaining <= 0) return 10;

  const ratio = (item.timeNeeded / 60) / hoursRemaining;
  return Math.max(1, Math.min(10, Math.round(ratio * 10)));
}

/** True when priority is auto-computed (has both dueDate and timeNeeded). */
export function isPriorityAuto(item) {
  return !!(item.dueDate && item.timeNeeded);
}

/**
 * Compute priority (1–10) for a single task inside a workflow.
 * Action: time-based. Waiting: stagnation-based. Send/pending: null (skip).
 */
export function computeWfTaskPriority(task) {
  if (task.nature === 'action') return computePriority(task);
  if (task.nature === 'waiting') {
    // Prefer actual chase date when set (new model) over the old relative followUpDays
    if (task.chaseDate) {
      const daysUntilChase = -daysBefore(task.chaseDate); // positive = future, ≤0 = overdue
      if (daysUntilChase <= 0) return 10;
      // Linear: 1 day away → P9, 5 days → P5, 9+ days → P1
      return Math.max(1, Math.min(9, 10 - Math.round(daysUntilChase)));
    }
    // Fallback for old data that only has waitingSince + followUpDays
    const daysOut   = task.waitingSince ? daysBefore(task.waitingSince) : 0;
    const threshold = task.followUpDays || 5;
    return Math.max(1, Math.min(10, Math.round((daysOut / threshold) * 10)));
  }
  return null;
}

/**
 * Compute a workflow's effective priority = maximum across its active tasks (1–10).
 * Returns null if there are no scoreable active tasks.
 */
export function computeWorkflowPriority(workflow) {
  const active = (workflow.tasks || []).filter(t => t.status === 'active');
  let best = 0;
  for (const task of active) {
    const p = computeWfTaskPriority(task);
    if (p !== null && p > best) { best = p; if (best === 10) break; }
  }
  return best > 0 ? best : null;
}

// ── Priority competition ──────────────────────────────────────────────────────
// When every visible item is objectively low priority (nothing due soon),
// scaling to an absolute [1,10] would leave them all at P1-P2 and give the
// user no signal about what to work on next.  Competition solves this by
// treating the set of visible items as their own ranked field: the frontrunner
// gets lifted to COMPETITION_CEIL (P7) so there's always a clear next action.

const COMPETITION_CEIL = 7; // the winner of a low-urgency field gets this
let _competitionMap = {};   // { [itemId]: competitivePriority } — set per render pass

/** Called by renderSections before each render so cards read consistent values. */
export function setCompetitionMap(map) { _competitionMap = map; }

/** True when this item's displayed priority has been competition-lifted. */
export function isCompetitionPriority(itemId) { return _competitionMap[itemId] !== undefined; }

/**
 * Returns the priority to display for an item — competition value when active,
 * otherwise the normal computed priority.
 */
export function getEffectivePriority(item) {
  const comp = _competitionMap[item.id];
  if (comp !== undefined) return comp;
  // Workflows with no active tasks return null — callers must guard against it
  return item.type === 'workflow' ? computeWorkflowPriority(item) : computePriority(item);
}

/**
 * Fraction of today's free calendar time this item consumes (0–1+).
 * Returns 0 when free time is unavailable or the item has no timeNeeded.
 */
export function getCalPressure(item, freeMinutes) {
  if (!freeMinutes || freeMinutes < 30 || !item.timeNeeded) return 0;
  return item.timeNeeded / freeMinutes;
}

/**
 * Build a competition map for a set of visible items.
 * Returns {} when any item is already P5+ (genuine urgency needs no intervention).
 * When all are low, scales so the leader reaches COMPETITION_CEIL and the rest
 * follow proportionally.  All-tied items get a gentle uniform nudge to P3.
 *
 * freeMinutes: today's total free working-hour minutes from the calendar (optional).
 * When provided, tasks that consume a large fraction of available time are
 * scored higher so they surface as the clear next action.
 */
export function computeCompetitionMap(items, freeMinutes = null) {
  const active = items.filter(i => !i.done);
  if (!active.length) return {};

  // Skip workflows with no active tasks — they have no scoreable priority
  const scored = active.flatMap(item => {
    const p = item.type === 'workflow' ? computeWorkflowPriority(item) : computePriority(item);
    if (p === null) return [];
    // Cal pressure bonus: tasks eating more of today's free time rank higher
    const calBoost = Math.min(4, Math.round(getCalPressure(item, freeMinutes) * 4));
    return [{ id: item.id, p: Math.min(10, p + calBoost) }];
  });
  if (!scored.length) return {};

  const maxP = Math.max(...scored.map(s => s.p));
  if (maxP >= 5) return {}; // real urgency exists — let absolute priorities speak

  const minP   = Math.min(...scored.map(s => s.p));
  const spread = maxP - minP;

  return Object.fromEntries(scored.map(({ id, p }) => [
    id,
    spread === 0
      ? 3  // everyone tied — nudge uniformly so the user knows work exists
      : Math.max(1, Math.round(1 + ((p - minP) / spread) * (COMPETITION_CEIL - 1))),
  ]));
}

/** Generate a unique ID. */
export function uid() {
  return 'id-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7);
}

export { TODAY };
