// Workflow task CRUD and state-transition actions.
// Split from store.js to keep that module under the line limit.
// All functions follow the same pattern: deep-clone S.data, mutate, persist via upd().

import { S, upd } from './store.js';
import { TODAY } from './constants.js';
import { uid } from './utils.js';

// ── Workflow task CRUD ────────────────────────────────────────────────────────

export function addWorkflowTask(workflowId, taskData) {
  const newData = JSON.parse(JSON.stringify(S.data));
  const items = newData[S.panel].items;
  const idx = items.findIndex(i => i.id === workflowId);
  if (idx < 0) return;
  if (!items[idx].tasks) items[idx].tasks = [];
  items[idx].tasks.push({
    id: uid(),
    nature: taskData.nature || 'action',
    subNature: taskData.subNature || '',
    title: taskData.title || '',
    status: 'active',
    // action fields
    dueDate: taskData.dueDate || '',
    priority: taskData.priority || 5,
    timeNeeded: taskData.timeNeeded || 60,
    focusSessions: [],
    // waiting fields
    waitingSince: taskData.waitingSince || '',
    followUpDays: taskData.followUpDays || 5,
    waitingFrom: taskData.waitingFrom || '',
    notes: taskData.notes || '',
  });
  upd(newData);
}

export function updateWorkflowTask(workflowId, taskId, changes) {
  const newData = JSON.parse(JSON.stringify(S.data));
  const items = newData[S.panel].items;
  const idx = items.findIndex(i => i.id === workflowId);
  if (idx < 0) return;
  const task = items[idx].tasks?.find(t => t.id === taskId);
  if (task) Object.assign(task, changes);
  upd(newData);
}

export function deleteWorkflowTask(workflowId, taskId) {
  const newData = JSON.parse(JSON.stringify(S.data));
  const items = newData[S.panel].items;
  const idx = items.findIndex(i => i.id === workflowId);
  if (idx < 0) return;
  items[idx].tasks = (items[idx].tasks || []).filter(t => t.id !== taskId);
  upd(newData);
}

export function closeWorkflowTask(workflowId, taskId) {
  const newData = JSON.parse(JSON.stringify(S.data));
  const items = newData[S.panel].items;
  const idx = items.findIndex(i => i.id === workflowId);
  if (idx < 0) return;
  const task = items[idx].tasks?.find(t => t.id === taskId);
  if (task) { task.status = 'closed'; task.closedAt = TODAY; }
  upd(newData);
}

// ── Workflow task completions (state transitions) ─────────────────────────────

// Closes the current task and spawns a 'send' task (user needs to tick it sent,
// then fill in waiting-on details to start a waiting task).
export function completeWorkflowTaskWithSend(workflowId, taskId) {
  const newData = JSON.parse(JSON.stringify(S.data));
  const items = newData[S.panel].items;
  const idx = items.findIndex(i => i.id === workflowId);
  if (idx < 0) return;
  const workflow = items[idx];
  const task = workflow.tasks?.find(t => t.id === taskId);
  if (task) {
    task.status = 'complete-with-actions';
    task.closedAt = TODAY;
    if (!workflow.tasks) workflow.tasks = [];
    workflow.tasks.push({
      id: uid(),
      nature: 'send',
      title: task.title,   // original title; UI prefixes "Send '" or "Chase '"
      isChase: task.nature === 'waiting',  // chase comes from a waiting task, send from an action
      // Carry over the previous waiting task's target return date so the chase form can default to it
      inheritedTargetReturnDate: task.targetReturnDate || '',
      status: 'active',
      sent: false,
      waitingFrom: task.waitingFrom || '',
      waitingSince: '',
      focusSessions: [],
      dueDate: '',
      priority: '',
      timeNeeded: 0,
      subNature: '',
      notes: '',
      spawnedFrom: taskId,
    });
  }
  upd(newData);
}

// Called when the user ticks 'Mark as sent' on a send task — closes it and
// immediately opens a waiting task with the provided dates.
export function markSendAndStartWaiting(workflowId, sendTaskId, waitingFrom, targetReturnDate, chaseDate) {
  const newData = JSON.parse(JSON.stringify(S.data));
  const items = newData[S.panel].items;
  const idx = items.findIndex(i => i.id === workflowId);
  if (idx < 0) return;
  const workflow = items[idx];
  const sendTask = workflow.tasks?.find(t => t.id === sendTaskId);
  if (sendTask) {
    sendTask.status = 'closed';
    sendTask.closedAt = TODAY;
    sendTask.sent = true;
    workflow.tasks.push({
      id: uid(),
      nature: 'waiting',
      subNature: 'Awaiting response',
      title: sendTask.title,
      status: 'active',
      waitingFrom: waitingFrom || '',
      targetReturnDate: targetReturnDate || '',
      chaseDate: chaseDate || '',
      waitingSince: TODAY,
      dueDate: '',
      priority: '',
      timeNeeded: 0,
      focusSessions: [],
      notes: '',
      spawnedFrom: sendTaskId,
    });
  }
  upd(newData);
}

// Closes the current task and spawns a 'pending' placeholder — the UI renders
// an inline nature picker so the user can immediately choose Action or Waiting.
export function completeWorkflowTaskWithActions(workflowId, taskId) {
  const newData = JSON.parse(JSON.stringify(S.data));
  const items = newData[S.panel].items;
  const idx = items.findIndex(i => i.id === workflowId);
  if (idx < 0) return;
  const workflow = items[idx];
  const task = workflow.tasks?.find(t => t.id === taskId);
  if (task) {
    task.status = 'complete-with-actions';
    task.closedAt = TODAY;
    if (!workflow.tasks) workflow.tasks = [];
    workflow.tasks.push({
      id: uid(),
      nature: 'pending',
      subNature: '',
      title: '',
      status: 'active',
      dueDate: '',
      priority: 5,
      timeNeeded: 60,
      focusSessions: [],
      waitingSince: '',
      followUpDays: 5,
      waitingFrom: '',
      notes: '',
      spawnedFrom: taskId,
    });
  }
  upd(newData);
}

// ── Workflow task focus sessions ──────────────────────────────────────────────

export function addWorkflowTaskFocusSession(workflowId, taskId, session) {
  const newData = JSON.parse(JSON.stringify(S.data));
  const items = newData[S.panel].items;
  const idx = items.findIndex(i => i.id === workflowId);
  if (idx < 0) return;
  const task = items[idx].tasks?.find(t => t.id === taskId);
  if (!task) return;
  if (!task.focusSessions) task.focusSessions = [];
  task.focusSessions.push(session);
  upd(newData);
}

export function removeWorkflowTaskFocusSession(workflowId, taskId, sessionIdx) {
  const newData = JSON.parse(JSON.stringify(S.data));
  const items = newData[S.panel].items;
  const idx = items.findIndex(i => i.id === workflowId);
  if (idx < 0) return;
  const task = items[idx].tasks?.find(t => t.id === taskId);
  if (!task || !task.focusSessions) return;
  task.focusSessions.splice(sessionIdx, 1);
  upd(newData);
}

// ── Checklist items (simple subtasks on any task or workflow task) ────────────
// Completing all items does NOT auto-complete the parent — the list is a prompt,
// not a gate. Both regular tasks and workflow tasks share the same { id, title, done } shape.

export function addChecklistItem(itemId, title) {
  const newData = JSON.parse(JSON.stringify(S.data));
  const items = newData[S.panel].items;
  const idx = items.findIndex(i => i.id === itemId);
  if (idx < 0) return;
  if (!items[idx].checklist) items[idx].checklist = [];
  items[idx].checklist.push({ id: uid(), title, done: false });
  upd(newData);
}

export function toggleChecklistItem(itemId, checkId) {
  const newData = JSON.parse(JSON.stringify(S.data));
  const items = newData[S.panel].items;
  const idx = items.findIndex(i => i.id === itemId);
  if (idx < 0) return;
  const check = items[idx].checklist?.find(c => c.id === checkId);
  if (check) check.done = !check.done;
  upd(newData);
}

export function deleteChecklistItem(itemId, checkId) {
  const newData = JSON.parse(JSON.stringify(S.data));
  const items = newData[S.panel].items;
  const idx = items.findIndex(i => i.id === itemId);
  if (idx < 0) return;
  items[idx].checklist = (items[idx].checklist || []).filter(c => c.id !== checkId);
  upd(newData);
}

export function addWfTaskChecklistItem(workflowId, taskId, title) {
  const newData = JSON.parse(JSON.stringify(S.data));
  const items = newData[S.panel].items;
  const idx = items.findIndex(i => i.id === workflowId);
  if (idx < 0) return;
  const task = items[idx].tasks?.find(t => t.id === taskId);
  if (!task) return;
  if (!task.checklist) task.checklist = [];
  task.checklist.push({ id: uid(), title, done: false });
  upd(newData);
}

export function toggleWfTaskChecklistItem(workflowId, taskId, checkId) {
  const newData = JSON.parse(JSON.stringify(S.data));
  const items = newData[S.panel].items;
  const idx = items.findIndex(i => i.id === workflowId);
  if (idx < 0) return;
  const task = items[idx].tasks?.find(t => t.id === taskId);
  if (!task) return;
  const check = task.checklist?.find(c => c.id === checkId);
  if (check) check.done = !check.done;
  upd(newData);
}

export function deleteWfTaskChecklistItem(workflowId, taskId, checkId) {
  const newData = JSON.parse(JSON.stringify(S.data));
  const items = newData[S.panel].items;
  const idx = items.findIndex(i => i.id === workflowId);
  if (idx < 0) return;
  const task = items[idx].tasks?.find(t => t.id === taskId);
  if (!task) return;
  task.checklist = (task.checklist || []).filter(c => c.id !== checkId);
  upd(newData);
}

// ── Legacy subtask stubs (kept for old data backward-compat only) ─────────────

export function addSubtask(id, title, timeNeeded) {
  const newData = JSON.parse(JSON.stringify(S.data));
  const items = newData[S.panel].items;
  const idx = items.findIndex(i => i.id === id);
  if (idx < 0) return;
  if (!items[idx].subtasks) items[idx].subtasks = [];
  items[idx].subtasks.push({ id: uid(), title, timeNeeded: timeNeeded || 60, status: 'with-me', currentJob: '', focusSessions: [] });
  upd(newData);
}

export function updateSubtask(id, subtaskId, changes) {
  const newData = JSON.parse(JSON.stringify(S.data));
  const items = newData[S.panel].items;
  const idx = items.findIndex(i => i.id === id);
  if (idx < 0) return;
  const st = items[idx].subtasks?.find(s => s.id === subtaskId);
  if (st) Object.assign(st, changes);
  upd(newData);
}

export function deleteSubtask(id, subtaskId) {
  const newData = JSON.parse(JSON.stringify(S.data));
  const items = newData[S.panel].items;
  const idx = items.findIndex(i => i.id === id);
  if (idx < 0) return;
  items[idx].subtasks = (items[idx].subtasks || []).filter(s => s.id !== subtaskId);
  upd(newData);
}

export function addSubtaskFocusSession(id, subtaskId, session) {
  const newData = JSON.parse(JSON.stringify(S.data));
  const items = newData[S.panel].items;
  const idx = items.findIndex(i => i.id === id);
  if (idx < 0) return;
  const st = items[idx].subtasks?.find(s => s.id === subtaskId);
  if (!st) return;
  if (!st.focusSessions) st.focusSessions = [];
  st.focusSessions.push(session);
  upd(newData);
}
