/**
 * esbuild wrapper — injects the PASSWORD_HASH environment variable at build
 * time so the password gate works on the deployed site without the secret ever
 * appearing in source code.
 *
 * Local dev  :  npm run build          (no hash → gate disabled, open access)
 * CI / deploy:  PASSWORD_HASH=<hash> npm run build  (hash injected by GitHub Actions)
 */

import * as esbuild from 'esbuild';

const passwordHash = process.env.PASSWORD_HASH ?? '';
const isWatch      = process.argv.includes('--watch');

const config = {
  entryPoints: ['src/js/render.js'],
  bundle:      true,
  outfile:     'dist/bundle.js',
  define: {
    // Replaced with the literal hash string at compile time.
    // Falls back to '' in local builds so the gate is skipped entirely.
    __PASSWORD_HASH__: JSON.stringify(passwordHash),
  },
};

if (isWatch) {
  const ctx = await esbuild.context(config);
  await ctx.watch();
  console.log('Watching for changes…');
} else {
  await esbuild.build(config);
  console.log(`dist/bundle.js  (password gate: ${passwordHash ? 'enabled' : 'disabled — local build'})`);
}
