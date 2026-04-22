/**
 * Supabase client — auth + board persistence.
 *
 * __SUPABASE_URL__ and __SUPABASE_ANON_KEY__ are replaced at build time by
 * scripts/build.mjs using env vars (GitHub Secrets in CI, local .env in dev).
 * They are never written to source code.
 *
 * When not configured (local build without env vars) all functions are no-ops
 * and isSupabaseConfigured() returns false — the app falls back to localStorage.
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = (typeof __SUPABASE_URL__  !== 'undefined' && __SUPABASE_URL__)  ? __SUPABASE_URL__  : '';
const SUPABASE_KEY = (typeof __SUPABASE_ANON_KEY__ !== 'undefined' && __SUPABASE_ANON_KEY__) ? __SUPABASE_ANON_KEY__ : '';

export const supabase = (SUPABASE_URL && SUPABASE_KEY)
  ? createClient(SUPABASE_URL, SUPABASE_KEY)
  : null;

export const isSupabaseConfigured = () => !!supabase;

// ── Auth ──────────────────────────────────────────────────────────────────────

export async function signInWithGoogle() {
  if (!supabase) return;
  await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: window.location.href.split('#')[0].split('?')[0],
      // Request calendar access alongside identity — no separate OAuth needed
      scopes: 'https://www.googleapis.com/auth/calendar',
      queryParams: { access_type: 'offline', prompt: 'consent' },
    },
  });
}

/** Returns the Google access token from the current Supabase session.
 *  Triggers a session refresh if the stored token looks stale. */
export async function getGoogleProviderToken() {
  if (!supabase) return null;
  const { data: { session } } = await supabase.auth.getSession();
  if (session?.provider_token) return session.provider_token;
  // Token missing — refresh the Supabase session to get a new one
  const { data: { session: fresh } } = await supabase.auth.refreshSession();
  return fresh?.provider_token ?? null;
}

export async function signOut() {
  if (!supabase) return;
  await supabase.auth.signOut();
}

export async function getSession() {
  if (!supabase) return null;
  const { data: { session } } = await supabase.auth.getSession();
  return session;
}

/** Subscribe to auth state changes. Returns an unsubscribe function. */
export function onAuthStateChange(cb) {
  if (!supabase) return () => {};
  const { data: { subscription } } = supabase.auth.onAuthStateChange(cb);
  return () => subscription.unsubscribe();
}

// ── Board data ────────────────────────────────────────────────────────────────

export async function loadBoard(userId) {
  if (!supabase || !userId) return null;
  const { data, error } = await supabase
    .from('boards')
    .select('data')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) { console.error('[supabase] loadBoard:', error.message); return null; }
  return data?.data ?? null;
}

export async function saveBoard(userId, boardData) {
  if (!supabase || !userId) return;
  const { error } = await supabase
    .from('boards')
    .upsert(
      { user_id: userId, data: boardData, updated_at: new Date().toISOString() },
      { onConflict: 'user_id' },
    );
  if (error) throw new Error(error.message);
}
