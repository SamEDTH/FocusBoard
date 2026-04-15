import { h } from '../dom.js';

/**
 * Shows a modal confirmation dialog.
 * Returns a Promise that resolves true (confirm) or false (cancel).
 */
export function showConfirm({ title, lines = [], confirmText = 'Confirm', cancelText = 'Cancel', danger = false }) {
  return new Promise(resolve => {
    const dismiss = ok => {
      overlay.remove();
      resolve(ok);
    };

    const confirmBtn = h('button', {
      class: danger ? 'btn btn-confirm-danger' : 'btn btn-confirm-ok',
      onClick: () => dismiss(true),
    }, confirmText);

    const cancelBtn = h('button', {
      class: 'btn',
      onClick: () => dismiss(false),
    }, cancelText);

    const dialog = h('div', { class: 'confirm-dialog' },
      h('div', { class: 'confirm-title' }, title),
      ...lines.map(l => h('div', { class: 'confirm-line' }, l)),
      h('div', { class: 'confirm-actions' }, cancelBtn, confirmBtn),
    );

    const overlay = h('div', { class: 'confirm-overlay' }, dialog);
    overlay.addEventListener('click', e => { if (e.target === overlay) dismiss(false); });

    document.body.appendChild(overlay);
    confirmBtn.focus();
  });
}
