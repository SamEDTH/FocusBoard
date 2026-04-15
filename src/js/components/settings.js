import { S, set, toggleTheme, toggleSystemTheme, updateWorkingHours, updateFocusDefaults, updateFollowUpDays, loadCalFreeMinutes } from '../store.js';
import { isPasswordProtected, lockApp } from './passwordGate.js';
import { h } from '../dom.js';
import {
  connectGoogle, disconnectGoogle, isGoogleConnected,
  connectOutlook, disconnectOutlook, isOutlookConnected,
} from '../services/calendar.js';

export function buildSettings() {
  const overlay = h('div', { class: 'settings-overlay', onClick: () => set({ showSettings: false }) });

  const soon = () => h('span', { class: 'settings-soon' }, 'Coming soon');

  const row = (label, sub, control) =>
    h('div', { class: 'settings-row' },
      h('div', null,
        h('div', { class: 'settings-row-label' }, label),
        h('div', { class: 'settings-row-sub' }, sub),
      ),
      control,
    );

  // ── Theme toggles ──────────────────────────────────────────────────────────

  const themeToggle = h('label', { class: 'toggle' },
    h('input', { type: 'checkbox', checked: S.theme === 'dark', onChange: toggleTheme }),
    h('span', { class: 'toggle-slider' }),
  );

  const systemToggle = h('label', { class: 'toggle' },
    h('input', { type: 'checkbox', checked: S.useSystemTheme, onChange: toggleSystemTheme }),
    h('span', { class: 'toggle-slider' }),
  );

  // ── Calendar connection ────────────────────────────────────────────────────

  function buildCalConnect(provider, label, logoColor) {
    const isConnected = provider === 'google' ? isGoogleConnected() : isOutlookConnected();
    const statusEl = h('div', { class: 'cal-status' });

    if (isConnected) {
      const disconnectBtn = h('button', { class: 'btn-cal-disconnect' }, 'Disconnect');
      disconnectBtn.addEventListener('click', () => {
        if (provider === 'google') disconnectGoogle();
        else disconnectOutlook();
        loadCalFreeMinutes();
        set({ showSettings: false });
        set({ showSettings: true }); // re-render settings
      });
      return h('div', { class: 'cal-connect-row' },
        h('div', { class: 'cal-connected-badge' },
          h('span', { class: 'cal-dot connected' }),
          `${label} connected`,
        ),
        disconnectBtn,
      );
    }

    // Not connected — show client ID input + connect button
    let clientId = '';
    let clientSecret = '';
    const input = h('input', {
      class: 'cal-client-input',
      placeholder: `${label} OAuth Client ID`,
      type: 'text',
    });
    input.addEventListener('input', e => { clientId = e.target.value.trim(); });

    const secretInput = provider === 'google' ? h('input', {
      class: 'cal-client-input',
      placeholder: 'Client Secret',
      type: 'password',
    }) : null;
    if (secretInput) secretInput.addEventListener('input', e => { clientSecret = e.target.value.trim(); });

    const connectBtn = h('button', { class: 'btn-cal-connect', style: { background: logoColor } }, `Connect ${label}`);
    connectBtn.addEventListener('click', async () => {
      if (!clientId) { statusEl.textContent = 'Paste your Client ID first.'; return; }
      if (provider === 'google' && !clientSecret) { statusEl.textContent = 'Paste your Client Secret first.'; return; }
      connectBtn.disabled = true;
      connectBtn.textContent = 'Connecting…';
      statusEl.textContent = '';
      try {
        if (provider === 'google') await connectGoogle(clientId, clientSecret);
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

    return h('div', { class: 'cal-connect-row' },
      input,
      ...(secretInput ? [secretInput] : []),
      connectBtn,
      statusEl,
    );
  }

  const googleSection = h('div', { class: 'cal-provider-section' },
    h('div', { class: 'cal-provider-label' }, 'Google Calendar'),
    h('div', { class: 'cal-provider-hint' },
      'Need a Client ID? ',
      h('a', { href: 'https://console.cloud.google.com', target: '_blank', class: 'cal-link' }, 'console.cloud.google.com'),
      ' → Enable Calendar API → OAuth 2.0 Client (Web app, origin: ',
      h('code', null, location.origin),
      ')',
    ),
    buildCalConnect('google', 'Google', '#4285F4'),
  );

  const outlookSection = h('div', { class: 'cal-provider-section' },
    h('div', { class: 'cal-provider-label' }, 'Microsoft Outlook'),
    h('div', { class: 'cal-provider-hint' },
      'Need a Client ID? ',
      h('a', { href: 'https://portal.azure.com', target: '_blank', class: 'cal-link' }, 'portal.azure.com'),
      ' → App registrations → New → SPA, redirect URI: ',
      h('code', null, location.origin),
    ),
    buildCalConnect('outlook', 'Outlook', '#0078D4'),
  );

  // ── Panel ──────────────────────────────────────────────────────────────────

  const panel = h('div', { class: 'settings-panel' },
    h('div', { class: 'settings-header' },
      h('span', { class: 'settings-title' }, 'Settings'),
      h('button', { class: 'settings-close', onClick: () => set({ showSettings: false }) }, '×'),
    ),
    h('div', { class: 'settings-body' },
      row('Dark mode', 'Switch between light and dark theme', themeToggle),
      row('Use system theme', 'Follow your OS dark/light preference', systemToggle),

      h('div', { class: 'settings-section-heading' }, 'Calendar'),
      h('div', { class: 'settings-cal-block' }, googleSection, outlookSection),

      row('Working hours', 'Used for priority calculations and focus block suggestions', (() => {
        const startIn = h('input', {
          type: 'time', class: 'wh-time-input', value: S.workStart || '09:30',
          onChange: e => updateWorkingHours(e.target.value, S.workEnd),
        });
        const endIn = h('input', {
          type: 'time', class: 'wh-time-input', value: S.workEnd || '17:30',
          onChange: e => updateWorkingHours(S.workStart, e.target.value),
        });
        return h('div', { class: 'wh-row' }, startIn, h('span', { class: 'wh-sep' }, 'to'), endIn);
      })()),
      row('Focus block defaults', 'Minimum slot size and buffer around meetings', (() => {
        const minBlockOpts = [15, 20, 30, 45, 60].map(v => ({ v: String(v), l: `${v} min` }));
        const bufferOpts   = [0, 5, 10, 15, 20, 30].map(v => ({ v: String(v), l: v === 0 ? 'None' : `${v} min` }));

        const minSel = h('select', { class: 'wh-time-input' },
          ...minBlockOpts.map(o => {
            const opt = h('option', { value: o.v }, o.l);
            if (String(S.focusMinBlock) === o.v) opt.selected = true;
            return opt;
          }),
        );
        minSel.addEventListener('change', e => updateFocusDefaults(S.focusBuffer, parseInt(e.target.value)));

        const bufSel = h('select', { class: 'wh-time-input' },
          ...bufferOpts.map(o => {
            const opt = h('option', { value: o.v }, o.l);
            if (String(S.focusBuffer) === o.v) opt.selected = true;
            return opt;
          }),
        );
        bufSel.addEventListener('change', e => updateFocusDefaults(parseInt(e.target.value), S.focusMinBlock));

        return h('div', { class: 'focus-defaults-col' },
          h('div', { class: 'focus-defaults-row' }, h('span', { class: 'wh-sep' }, 'Min block'), minSel),
          h('div', { class: 'focus-defaults-row' }, h('span', { class: 'wh-sep' }, 'Buffer'), bufSel),
        );
      })()),
      row('Follow-up trigger', 'Days before target return date to set chase date', (() => {
        const inp = h('input', {
          type: 'number', class: 'wh-time-input', value: S.followUpDays ?? 5,
          min: '1', max: '60', style: { width: '64px' },
        });
        inp.addEventListener('change', e => updateFollowUpDays(Math.max(1, parseInt(e.target.value) || 5)));
        return h('div', { class: 'wh-row' }, inp, h('span', { class: 'wh-sep' }, 'days'));
      })()),

      // Lock option — only shown when the deployed build has password protection enabled
      isPasswordProtected() ? h('div', { class: 'settings-lock-row' },
        h('div', null,
          h('div', { class: 'settings-row-label' }, 'Lock app'),
          h('div', { class: 'settings-row-sub' }, 'Require password again on next visit'),
        ),
        h('button', {
          class: 'btn-lock',
          onClick: () => { lockApp(); set({ showSettings: false }); },
        }, '🔒 Lock'),
      ) : null,
    ),
  );

  const frag = document.createDocumentFragment();
  frag.appendChild(overlay);
  frag.appendChild(panel);
  return frag;
}
