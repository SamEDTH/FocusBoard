/**
 * esbuild wrapper — injects the PASSWORD_HASH environment variable at build
 * time so the password gate works on the deployed site without the secret ever
 * appearing in source code.
 *
 * Local dev  :  npm run build          (no hash → gate disabled, open access)
 * CI / deploy:  PASSWORD_HASH=<hash> npm run build  (hash injected by GitHub Actions)
 */

import * as esbuild from 'esbuild';

const passwordHash   = process.env.PASSWORD_HASH    ?? '';
const supabaseUrl    = process.env.SUPABASE_URL      ?? '';
const supabaseKey    = process.env.SUPABASE_ANON_KEY ?? '';
const isWatch        = process.argv.includes('--watch');

const config = {
  entryPoints: ['src/js/render.js'],
  bundle:      true,
  outfile:     'dist/bundle.js',
  define: {
    // All three are injected from environment variables / GitHub Secrets.
    // They are never written to source code.
    __PASSWORD_HASH__:   JSON.stringify(passwordHash),
    __SUPABASE_URL__:    JSON.stringify(supabaseUrl),
    __SUPABASE_ANON_KEY__: JSON.stringify(supabaseKey),
  },
};

if (isWatch) {
  const ctx = await esbuild.context(config);
  await ctx.watch();
  console.log('Watching for changes…');
} else {
  await esbuild.build(config);
  const authMode = supabaseUrl ? 'Supabase (Google sign-in)' : passwordHash ? 'password gate' : 'open (local build)';
  console.log(`dist/bundle.js  (auth: ${authMode})`);
}
