# Focusboard — Electron Desktop App Roadmap

## Phase 1 — Project scaffold
- [ ] Run `npm init` in the project root; add `"main": "electron/main.js"` to `package.json`
- [ ] Install deps: `electron`, `electron-builder`, `electron-updater`, `electron-store` (replaces `localStorage`)
- [ ] Create `electron/main.js` — creates `BrowserWindow`, loads `index.html` via `app.getPath` not `file://`
- [ ] Create `electron/preload.js` — expose a minimal `contextBridge` API (`store.get`, `store.set`) so renderer never touches Node directly
- [ ] Set `contextIsolation: true`, `nodeIntegration: false` in `BrowserWindow` webPreferences

## Phase 2 — Migrate storage
- [ ] Replace `localStorage` calls in `src/js/store.js` with IPC calls to `electron-store` via the preload bridge (`window.electronStore.get/set`)
- [ ] Keep `localStorage` fallback for PWA/browser use (feature-detect `window.electronStore`)

## Phase 3 — Build config (electron-builder)
- [ ] Add `build` section to `package.json` (or `electron-builder.yml`):
  - `appId`, `productName: "Focusboard"`, `copyright`
  - **Windows**: `target: nsis`, `installerIcon`, one-click install option
  - **macOS**: `target: dmg`, `category: public.app-category.productivity`, code-sign identity
  - **Linux**: `target: [AppImage, deb]`
- [ ] Add icon assets: `build/icon.icns` (mac), `build/icon.ico` (win), `build/icon.png` (linux, 512×512)
- [ ] Add npm scripts:
  - `"start": "electron ."`
  - `"build:win": "electron-builder --win"`
  - `"build:mac": "electron-builder --mac"`
  - `"build:linux": "electron-builder --linux"`
  - `"build:all": "electron-builder -mwl"`

## Phase 4 — Bundle integration
- [ ] Add `esbuild` as devDependency
- [ ] Add `"build:js": "esbuild src/js/render.js --bundle --outfile=dist/bundle.js"` npm script
- [ ] Wire `build:js` to run before `electron-builder` in the build scripts
- [ ] Remove the manually-written `dist/bundle.js` once esbuild is in place

## Phase 5 — Auto-updater
- [ ] Integrate `electron-updater` in `electron/main.js` — check for updates on launch, notify user via dialog
- [ ] Set up GitHub Releases as publish target in builder config: `publish: { provider: 'github' }`
- [ ] Add update channel UI stub in Settings panel (show current version from `process.env.npm_package_version`, "Check for updates" button)

## Phase 6 — CI/CD (GitHub Actions)
- [ ] Initialise a GitHub repo for Focusboard
- [ ] Create `.github/workflows/build.yml` triggered on push to `main` and on `v*` release tags
- [ ] Matrix strategy across `[windows-latest, macos-latest, ubuntu-latest]`
- [ ] Steps per runner: checkout → `npm ci` → `npm run build:js` → `npm run build:<os>` → upload artifact
- [ ] On release tag: run all three builds → attach installers to GitHub Release automatically
- [ ] Store code-signing certs as encrypted GitHub Secrets (`CSC_LINK`, `CSC_KEY_PASSWORD` for mac/win)

## Phase 7 — Code signing
- [ ] **macOS**: Apple Developer ID cert + notarisation via `notarytool` (add `afterSign` hook in builder config)
- [ ] **Windows**: EV or OV code-signing cert (self-sign is fine for internal use; EV avoids SmartScreen warnings for public distribution)
- [ ] **Linux**: No signing required; GPG-sign the `.deb` if distributing via an apt repo

## Phase 8 — Polish
- [ ] Add native OS menu bar (File, Edit, View, Help) using `Menu.buildFromTemplate` in `main.js`
- [ ] Add `electron-context-menu` for right-click support in the renderer
- [ ] Add system tray icon with a global shortcut to quick-add an item
- [ ] Handle `app.setLoginItemSettings` for optional launch-at-login preference
- [ ] Deep link support (`focusboard://`) for future calendar OAuth callbacks
- [ ] Tag `v1.0.0` to trigger first CI build and attach installers to GitHub Release
