/**
 * Lightweight virtual-DOM-free element factory.
 * h('div', { class: 'foo', onClick: handler }, 'text', childNode)
 */
export function h(tag, attrs, ...children) {
  const el = document.createElement(tag);

  if (attrs) {
    for (const [key, value] of Object.entries(attrs)) {
      if (key === 'class') {
        el.className = value;
      } else if (key === 'style' && typeof value === 'object') {
        // CSS custom properties (--foo) must use setProperty; Object.assign silently ignores them
        for (const [prop, val] of Object.entries(value)) {
          if (prop.startsWith('--')) el.style.setProperty(prop, val);
          else el.style[prop] = val;
        }
      } else if (key.startsWith('on') && typeof value === 'function') {
        el.addEventListener(key.slice(2).toLowerCase(), value);
      } else if (['checked', 'value', 'disabled', 'selected'].includes(key)) {
        el[key] = value;
      } else {
        el.setAttribute(key, value);
      }
    }
  }

  for (const child of children) {
    if (child == null || child === false) continue;
    if (typeof child === 'string' || typeof child === 'number') {
      el.appendChild(document.createTextNode(String(child)));
    } else if (child instanceof Node) {
      el.appendChild(child);
    } else if (Array.isArray(child)) {
      child.forEach(x => {
        if (x instanceof Node) el.appendChild(x);
        else if (x != null) el.appendChild(document.createTextNode(String(x)));
      });
    }
  }

  return el;
}

/** Render a coloured badge pill. */
export function badge(type, text) {
  return h('span', { class: `badge badge-${type}` }, text);
}

/** Render a label + value pair used inside expanded card grids. */
export function expField(label, value, extraClass) {
  return h('div', null,
    h('div', { class: 'exp-label' }, label),
    h('div', { class: `exp-value${extraClass ? ' ' + extraClass : ''}` }, value),
  );
}

/** Create an SVG element with raw inner markup. */
export function createSvg(width, height, viewBox, innerHTML) {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('width', width);
  svg.setAttribute('height', height);
  svg.setAttribute('viewBox', viewBox);
  svg.setAttribute('fill', 'none');
  svg.innerHTML = innerHTML;
  return svg;
}

/** Priority picker — 10 coloured buttons, 1 (green) → 10 (red). */
export function buildPriorityPicker(current, onChange) {
  const COLORS = [
    '#1D9E75','#4CAF6A','#7BBF44','#AAC928','#CEC212',
    '#F0A500','#E07820','#D04A10','#C02808','#A32D2D',
  ];
  const norm = v => {
    if (typeof v === 'number') return Math.max(1, Math.min(10, Math.round(v)));
    if (v === 'urgent') return 8; if (v === 'medium') return 5; if (v === 'low') return 2;
    return 5;
  };
  let selected = norm(current);
  const wrap = h('div', { class: 'priority-picker' });
  const btns = [];

  const refresh = () => btns.forEach((b, i) => {
    b.classList.toggle('active', i + 1 === selected);
  });

  for (let i = 1; i <= 10; i++) {
    const color = COLORS[i - 1];
    const btn = h('button', {
      class: `priority-pick-btn${selected === i ? ' active' : ''}`,
      style: { '--pc': color },
      title: `Priority ${i}`,
      onClick: e => { e.stopPropagation(); selected = i; refresh(); onChange(i); },
    }, String(i));
    btns.push(btn);
    wrap.appendChild(btn);
  }
  return wrap;
}

/** Custom styled dropdown replacing native <select>. */
export function customSelect(options, value, onChange) {
  let current = value;

  const chevron = createSvg('10', '10', '0 0 10 10',
    '<path d="M2 3.5L5 6.5L8 3.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>',
  );
  chevron.style.flexShrink = '0';
  chevron.style.transition = 'transform 0.2s ease';

  const valueEl = h('span', { class: 'csel-value' }, options.find(o => o.v === current)?.l || '');

  const trigger = h('button', { class: 'csel-trigger' }, valueEl, chevron);

  const dropdown = h('div', { class: 'csel-dropdown' },
    ...options.map(o => {
      const opt = h('div', { class: `csel-option${o.v === current ? ' selected' : ''}` }, o.l);
      opt.addEventListener('click', e => {
        e.stopPropagation();
        current = o.v;
        valueEl.textContent = o.l;
        dropdown.querySelectorAll('.csel-option').forEach(el => el.classList.remove('selected'));
        opt.classList.add('selected');
        onChange(o.v);
        close();
      });
      return opt;
    }),
  );

  const container = h('div', { class: 'csel' }, trigger, dropdown);

  function open() {
    container.classList.add('open');
    chevron.style.transform = 'rotate(180deg)';
    setTimeout(() => document.addEventListener('click', outsideClick), 0);
  }
  function close() {
    container.classList.remove('open');
    chevron.style.transform = '';
    document.removeEventListener('click', outsideClick);
  }
  function outsideClick(e) { if (!container.contains(e.target)) close(); }

  trigger.addEventListener('click', e => {
    e.stopPropagation();
    container.classList.contains('open') ? close() : open();
  });

  return container;
}
