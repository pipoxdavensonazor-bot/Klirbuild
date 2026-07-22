# KlirBuild Desktop (Windows `.exe`)

Shell Tauri 2 qui charge `https://klirline.app`.

## Build Windows

Sur une machine **Windows** (WebView2 + [Rust](https://rustup.rs) + Node) :

```bash
cd apps/desktop
npm install
npx tauri icon src-tauri/icons/icon.png   # génère .ico / tailles
npm run build
```

Sorties typiques :
- `src-tauri/target/release/bundle/nsis/KlirBuild_*_x64-setup.exe`
- `src-tauri/target/release/bundle/msi/KlirBuild_*_x64_en-US.msi`

## Dev

```bash
npm run dev
```

Ouvre une fenêtre WebView sur KlirBuild prod (ou change `devUrl` / `windows.url` dans `src-tauri/tauri.conf.json`).
