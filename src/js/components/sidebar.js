import { S, getPanelData, getPanelColor, switchPanel, gotoCategory, gotoDashboard, gotoWorkload, set, renameCategory, deleteCategory, getFilteredItems } from '../store.js';
import { h, createSvg } from '../dom.js';
import { onDropCat } from '../dragdrop.js';
import { buildAddCatForm } from './addForm.js';

function calendarIcon() {
  return createSvg('13', '13', '0 0 14 14',
    '<rect x="1" y="2" width="12" height="11" rx="1.5" stroke="currentColor" stroke-width="1.2"/>' +
    '<line x1="1" y1="5.5" x2="13" y2="5.5" stroke="currentColor" stroke-width="1.2"/>' +
    '<line x1="4.5" y1="1" x2="4.5" y2="4" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/>' +
    '<line x1="9.5" y1="1" x2="9.5" y2="4" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/>',
  );
}

function buildCategoryItem(cat, panel) {
  const count = panel.items.filter(i => i.categoryId === cat.id && !i.done).length;
  const isActive = S.view === 'category' && S.activeCat === cat.id;

  // Inline rename mode
  if (S.editingCat === cat.id) {
    const input = h('input', { class: 'cat-rename-input', value: cat.name });
    input.addEventListener('keydown', e => {
      if (e.key === 'Enter' && input.value.trim()) renameCategory(cat.id, input.value.trim());
      if (e.key === 'Escape') set({ editingCat: null });
    });
    setTimeout(() => { input.focus(); input.select(); }, 50);
    return h('div', { class: 'sub-item cat-editing' },
      input,
      h('button', { class: 'btn-cat-add', onClick: () => { if (input.value.trim()) renameCategory(cat.id, input.value.trim()); } }, '✓'),
      h('button', { class: 'btn-cat-cancel', onClick: () => set({ editingCat: null }) }, '✕'),
    );
  }

  const editBtn = h('button', {
    class: 'cat-action-btn',
    title: 'Rename',
    onClick: e => { e.stopPropagation(); set({ editingCat: cat.id }); },
  }, createSvg('10', '10', '0 0 10 10',
    '<path d="M7 1.5l1.5 1.5L3 8.5H1.5V7L7 1.5Z" stroke="currentColor" stroke-width="1.1" fill="none" stroke-linejoin="round"/>' +
    '<path d="M6 2.5l1.5 1.5" stroke="currentColor" stroke-width="1.1" stroke-linecap="round"/>',
  ));
  const delBtn = h('button', {
    class: 'cat-action-btn cat-delete-btn',
    title: 'Delete',
    onClick: e => { e.stopPropagation(); deleteCategory(cat.id); },
  }, createSvg('10', '10', '0 0 10 10',
    '<path d="M2 3.5h6M4 3.5V2h2v1.5M3 3.5l.5 5h3l.5-5" stroke="currentColor" stroke-width="1.1" stroke-linecap="round" stroke-linejoin="round" fill="none"/>',
  ));

  return h('div', {
    class: `sub-item${isActive ? ' active' : ''}`,
    onClick: () => gotoCategory(cat.id),
    onDragover: e => { e.preventDefault(); e.currentTarget.classList.add('drop-target'); },
    onDragleave: e => { e.currentTarget.classList.remove('drop-target'); },
    onDrop: e => onDropCat(e, cat.id),
  },
  h('div', { class: 'sub-pip' }),
  h('span', { class: 'sub-item-name' }, cat.name),
  count > 0 ? h('span', { class: 'nav-count' }, count) : null,
  editBtn,
  delBtn,
  );
}

const SB_WIDTH_KEY = 'fb_sidebar_w';
const SB_MIN = 140, SB_MAX = 420, SB_DEFAULT = 210;

function getSidebarWidth() {
  try { return Math.min(SB_MAX, Math.max(SB_MIN, parseInt(localStorage.getItem(SB_WIDTH_KEY)) || SB_DEFAULT)); }
  catch { return SB_DEFAULT; }
}

function makeSidebarResizeHandle(sidebarEl) {
  const handle = h('div', { class: 'sidebar-resize-handle' });
  handle.addEventListener('mousedown', e => {
    e.preventDefault();
    const startX = e.clientX;
    const startW = sidebarEl.offsetWidth;
    document.body.classList.add('sb-resizing');

    const onMove = e => {
      const w = Math.min(SB_MAX, Math.max(SB_MIN, startW + (e.clientX - startX)));
      sidebarEl.style.setProperty('--sb-w', `${w}px`);
    };
    const onUp = e => {
      const w = Math.min(SB_MAX, Math.max(SB_MIN, startW + (e.clientX - startX)));
      try { localStorage.setItem(SB_WIDTH_KEY, w); } catch {}
      document.body.classList.remove('sb-resizing');
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  });
  return handle;
}

export function buildSidebar() {
  const panel = getPanelData();
  const activeCount = panel.items.filter(i => !i.done).length;
  const capitalize = s => s[0].toUpperCase() + s.slice(1);
  const savedWidth  = getSidebarWidth();

  const sidebarEl = h('div', { class: `sidebar${S.sidebarCollapsed ? ' collapsed' : ''}` },
    // Panel switcher (Work / Life)
    h('div', { class: 'panel-switcher' },
      h('button', { class: `ps-btn${S.panel === 'work' ? ' active' : ''}`, onClick: () => switchPanel('work') }, 'Work'),
      h('button', { class: `ps-btn${S.panel === 'life' ? ' active' : ''}`, onClick: () => switchPanel('life') }, 'Life'),
    ),

    // Panel section heading + Dashboard nav
    h('div', { class: 'sidebar-section' }, capitalize(S.panel)),
    h('div', { class: `nav-item${S.view === 'dashboard' ? ' active' : ''}`, onClick: gotoDashboard },
      h('div', { class: 'nav-dot', style: { background: getPanelColor() } }),
      'Dashboard',
      h('span', { class: 'nav-count' }, activeCount),
    ),

    // Category list
    ...panel.categories.map(cat => buildCategoryItem(cat, panel)),
    S.showAddCat ? buildAddCatForm() : null,
    h('div', { class: 'add-cat-btn', onClick: () => set({ showAddCat: !S.showAddCat, showAddItem: false }) }, '+ Add category'),

    // Insights section
    h('div', { class: 'sidebar-section' }, 'Insights'),
    h('div', {
      class: `nav-item${S.view === 'workload' ? ' active' : ''}`,
      onClick: gotoWorkload,
    },
      h('div', { class: 'nav-dot', style: { background: '#7B61FF' } }),
      'Summary',
    ),

    // Schedule section
    h('div', { class: 'sidebar-section' }, 'Schedule'),
    h('div', {
      class: `nav-item${S.view === 'focus' ? ' active' : ''}`,
      onClick: () => set({ view: 'focus', activeCat: null }),
    },
      h('div', { class: 'nav-dot', style: { background: '#BA7517' } }),
      'Focus blocks',
      (() => {
        const n = [...(S.data?.work?.items || []), ...(S.data?.life?.items || [])].filter(i => i.focusBlock && !i.done).length;
        return n > 0 ? h('span', { class: 'nav-count' }, n) : null;
      })(),
    ),
    h('div', {
      class: `nav-item${S.view === 'calendar' ? ' active' : ''}`,
      onClick: () => set({ view: 'calendar', activeCat: null }),
    }, calendarIcon(), 'Calendar'),

  );

  // Apply saved width via CSS custom property (collapsed class overrides it to 0)
  sidebarEl.style.setProperty('--sb-w', `${savedWidth}px`);

  // Attach resize handle only when sidebar is visible
  if (!S.sidebarCollapsed) {
    sidebarEl.appendChild(makeSidebarResizeHandle(sidebarEl));
  }

  return sidebarEl;
}
