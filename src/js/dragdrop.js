import { S, upd } from './store.js';

/** Transient drag state — never triggers a re-render. */
const drag = { id: null, catId: null };
let ghostEl = null;
let dropState = { targetId: null, insertBefore: true, targetCatId: null };

/** Exported so card.js can read it during render to apply the settle animation. */
export let lastDroppedId = null;

// ── Auto-scroll ───────────────────────────────────────────────────────────────

let scrollContainer = null;
let scrollSpeed = 0;
let scrollRAF = null;

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
  if (scrollRAF) { cancelAnimationFrame(scrollRAF); scrollRAF = null; }
  scrollSpeed = 0;
}

function handleGlobalDragOver(e) {
  const panel = document.querySelector('.task-panel');
  if (!panel) return;
  const rect = panel.getBoundingClientRect();
  const threshold = 100;
  const maxSpeed = 14;

  if (e.clientY > rect.bottom - threshold) {
    const intensity = (e.clientY - (rect.bottom - threshold)) / threshold;
    scrollSpeed = Math.ceil(intensity * maxSpeed);
  } else if (e.clientY < rect.top + threshold) {
    const intensity = ((rect.top + threshold) - e.clientY) / threshold;
    scrollSpeed = -Math.ceil(intensity * maxSpeed);
  } else {
    scrollSpeed = 0;
    stopScroll();
    return;
  }

  scrollContainer = panel;
  startScrollLoop();
}

// ── Ghost element ─────────────────────────────────────────────────────────────

function createGhost(height) {
  ghostEl = document.createElement('div');
  ghostEl.className = 'drag-ghost';
  ghostEl.style.height = height + 'px';
  ghostEl.style.pointerEvents = 'none';
}

function removeGhost() {
  if (ghostEl && ghostEl.parentNode) ghostEl.parentNode.removeChild(ghostEl);
  ghostEl = null;
}

function cleanup() {
  removeGhost();
  stopScroll();
  document.removeEventListener('dragover', handleGlobalDragOver);
  document.querySelectorAll('.dragging').forEach(el => el.classList.remove('dragging'));
  document.querySelectorAll('.drop-target').forEach(el => el.classList.remove('drop-target'));
  document.body.classList.remove('is-dragging');
  drag.id = null;
  drag.catId = null;
  dropState = { targetId: null, insertBefore: true, targetCatId: null };
}

// ── Public handlers ───────────────────────────────────────────────────────────

export function onDragStart(e, id, catId) {
  drag.id = id;
  drag.catId = catId;
  lastDroppedId = null;
  dropState = { targetId: null, insertBefore: true, targetCatId: catId };
  e.dataTransfer.effectAllowed = 'move';
  e.dataTransfer.setData('text/plain', id);
  document.addEventListener('dragover', handleGlobalDragOver);

  setTimeout(() => {
    const el = document.querySelector(`[data-id="${id}"]`);
    if (el) {
      el.classList.add('dragging');
      createGhost(el.offsetHeight);
    } else {
      createGhost(58);
    }
    document.body.classList.add('is-dragging');
  }, 0);
}

export function onDragEnd() {
  cleanup();
}

/** Card drag-over: move ghost to show insertion point. */
export function onDragOver(e, targetId) {
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

/** Drop on a card: insert at the ghost's current position. */
export function onDrop(e, targetId, targetCatId) {
  e.preventDefault();
  e.stopPropagation();
  const droppedId = drag.id;
  const savedDrop = { ...dropState }; // snapshot before cleanup resets it
  cleanup();
  if (!droppedId || !savedDrop.targetId) return;

  const newData = JSON.parse(JSON.stringify(S.data));
  const items = newData[S.panel].items;
  const fromIdx = items.findIndex(i => i.id === droppedId);
  if (fromIdx < 0) return;

  items[fromIdx].categoryId = targetCatId;
  const [moved] = items.splice(fromIdx, 1);

  const toIdx = items.findIndex(i => i.id === savedDrop.targetId);
  if (toIdx < 0) {
    items.push(moved);
  } else if (savedDrop.insertBefore) {
    items.splice(toIdx, 0, moved);
  } else {
    items.splice(toIdx + 1, 0, moved);
  }

  // Set before upd() so buildCard reads it during the triggered re-render
  lastDroppedId = droppedId;
  upd(newData);
  setTimeout(() => { lastDroppedId = null; }, 700);
}

/** Drop on a sidebar category: move item to that category without reordering. */
export function onDropCat(e, catId) {
  e.preventDefault();
  e.stopPropagation();
  e.currentTarget.classList.remove('drop-target');
  const droppedId = drag.id;
  cleanup();
  if (!droppedId) return;

  const newData = JSON.parse(JSON.stringify(S.data));
  const items = newData[S.panel].items;
  const idx = items.findIndex(i => i.id === droppedId);
  if (idx >= 0) items[idx].categoryId = catId;

  lastDroppedId = droppedId;
  upd(newData);
  setTimeout(() => { lastDroppedId = null; }, 700);
}
