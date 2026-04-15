import { h } from '../dom.js';

// __PASSWORD_HASH__ is replaced at compile time by scripts/build.mjs.
// In local dev builds it is '' so the gate is skipped entirely — no friction.
// In GitHub Actions deployments it is the SHA-256 hash from the PASSWORD_HASH secret.
const REQUIRED_HASH = (typeof __PASSWORD_HASH__ !== 'undefined' && __PASSWORD_HASH__)
  ? __PASSWORD_HASH__
  : null;

const AUTH_KEY = 'focusboard-auth';

// ── Public helpers ─────────────────────────────────────────────────────────────

export function isPasswordProtected() { return !!REQUIRED_HASH; }

export function isAuthenticated() {
  if (!REQUIRED_HASH) return true;              // no password configured
  return localStorage.getItem(AUTH_KEY) === REQUIRED_HASH;
}

export function lockApp() {
  localStorage.removeItem(AUTH_KEY);
}

// ── Internal ──────────────────────────────────────────────────────────────────

async function sha256hex(str) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

// ── Gate component ────────────────────────────────────────────────────────────

export function buildPasswordGate(onSuccess) {
  const errorEl = h('p',      { class: 'pg-error' });
  const input   = h('input',  { type: 'password', class: 'pg-input', placeholder: 'Password', autocomplete: 'current-password' });
  const btn     = h('button', { class: 'pg-btn' }, 'Unlock');

  async function attempt() {
    const val = input.value;
    if (!val) return;
    btn.disabled    = true;
    btn.textContent = '…';
    const hash = await sha256hex(val);
    if (hash === REQUIRED_HASH) {
      localStorage.setItem(AUTH_KEY, hash);
      gate.remove();
      onSuccess();
    } else {
      errorEl.textContent = 'Incorrect password — try again.';
      input.value = '';
      input.focus();
      btn.disabled    = false;
      btn.textContent = 'Unlock';
    }
  }

  input.addEventListener('keydown', e => { if (e.key === 'Enter') attempt(); });
  btn.addEventListener('click', attempt);

  const gate = h('div', { class: 'pg-overlay' },
    h('div', { class: 'pg-box' },
      h('div', { class: 'pg-logo' },
        h('span', { class: 'pg-logo-focus' }, 'focus'),
        h('span', { class: 'pg-logo-board' }, 'board'),
      ),
      h('p',   { class: 'pg-sub' }, 'Enter your password to continue'),
      input,
      btn,
      errorEl,
    ),
  );

  // Focus the input after the overlay mounts
  requestAnimationFrame(() => input.focus());

  return gate;
}
