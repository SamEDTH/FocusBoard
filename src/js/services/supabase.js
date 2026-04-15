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
      // Works for both localhost and the deployed GitHub Pages URL
      redirectTo: window.location.href.split('#')[0].split('?')[0],
    },
  });
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
  if (error) console.error('[supabase] saveBoard:', error.message);
}
