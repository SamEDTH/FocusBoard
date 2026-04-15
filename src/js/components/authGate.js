import { h } from '../dom.js';
import { signInWithGoogle } from '../services/supabase.js';

export function buildAuthGate() {
  const btn = h('button', { class: 'ag-btn' });

  // Google logo
  const logoSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  logoSvg.setAttribute('width', '18'); logoSvg.setAttribute('height', '18'); logoSvg.setAttribute('viewBox', '0 0 18 18');
  logoSvg.innerHTML = `
    <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908C16.658 13.956 17.64 11.649 17.64 9.2z"/>
    <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z"/>
    <path fill="#FBBC05" d="M3.964 10.707c-.18-.54-.282-1.117-.282-1.707 0-.59.102-1.167.282-1.707V4.961H.957C.347 6.175 0 7.55 0 9s.348 2.825.957 4.039l3.007-2.332z"/>
    <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.961L3.964 7.293C4.672 5.166 6.656 3.58 9 3.58z"/>
  `;

  btn.appendChild(logoSvg);
  btn.appendChild(document.createTextNode(' Sign in with Google'));

  btn.addEventListener('click', async () => {
    btn.disabled = true;
    btn.childNodes[1].textContent = ' Redirecting…';
    await signInWithGoogle();
  });

  return h('div', { class: 'ag-overlay' },
    h('div', { class: 'ag-box' },
      h('div', { class: 'ag-logo' },
        h('span', { class: 'ag-logo-focus' }, 'focus'),
        h('span', { class: 'ag-logo-board' }, 'board'),
      ),
      h('p', { class: 'ag-sub' }, 'Sign in to access your board'),
      btn,
      h('p', { class: 'ag-note' }, 'Your data is private to your account'),
    ),
  );
}
