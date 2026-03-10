# Embedding TerriaJS as a Micro-Frontend in React

This document describes how the Lungsod Digital Twin (`packages/twin`) can be embedded
inside an existing React application as a true micro-frontend — no iframe required.

Community reference: [TerriaJS Discussion #7282](https://github.com/TerriaJS/terriajs/discussions/7282)

## Why not an iframe?

The [official TerriaJS recommendation](https://docs.terria.io/guide/deploying/controlling-in-an-iframe-or-popup/)
is to embed via iframe with message passing. This works but has drawbacks:

- No shared auth context (cookies/headers must be proxied separately)
- Limited cross-frame communication (postMessage is async and untyped)
- Double scrollbars, focus trapping issues, no shared CSS
- Cannot access `terria` or `viewState` objects directly from the host app

Our approach uses a **webpack library export** so the host app loads TerriaMap.js as a
script tag and calls `window.LungsodTwin.mountTwin(container)` directly.

## Architecture

```
Host App (Command)                    Twin Package (TerriaMap)
┌─────────────────────┐               ┌────────────────────────┐
│  DigitalTwin.tsx     │               │  entry.js              │
│                      │  <script>     │    export mountTwin()  │
│  1. Load TerriaMap.js├──────────────>│    export unmountTwin()│
│  2. Load TerriaMap.css               │                        │
│  3. Load svg-sprite.js               │  webpack.config.js     │
│                      │               │    library: LungsodTwin│
│  4. mountTwin(div)   │──────────────>│    type: "window"      │
│     => { terria,     │<──────────────│                        │
│        viewState,    │  returns      │  Standalone mode:      │
│        unmount }     │               │    auto-mounts if #ui  │
│                      │               │    exists in DOM       │
│  5. unmount() on     │               │                        │
│     component unmount│               │                        │
└─────────────────────┘               └────────────────────────┘
```

## API

### `window.LungsodTwin.mountTwin(target?)`

Mount TerriaJS into a container element.

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `target` | `HTMLElement \| string` | `"ui"` | DOM element or element ID to mount into |

**Returns:** `Promise<{ terria, viewState, unmount }>`

- `terria` — The Terria model instance (catalog, clock, etc.)
- `viewState` — The ViewState instance (UI state, panels, search)
- `unmount()` — Tear down the React root and clean up

### `window.LungsodTwin.unmountTwin()`

Tear down the current mount. Safe to call multiple times.

## Consumer Example

See `packages/command/src/components/DigitalTwin/index.tsx` for the full implementation.

Key steps:

```tsx
// 1. Load assets in parallel
await Promise.all([
  loadCSS("/twin/build/TerriaMap.css"),
  loadScript("/twin/build/TerriaMap.js"),
  loadScript("/twin/build/svg-sprite.js"),  // for <use xlink:href="#terriajs-*">
]);

// 2. Mount into a <div ref>
const instance = await window.LungsodTwin.mountTwin(containerRef.current);

// 3. Use terria/viewState for programmatic control
// e.g. instance.terria.addUserCatalogMember(...)

// 4. Clean up on unmount
instance.unmount();
```

## CSS Height Chain

TerriaJS uses `height: 100%` throughout its component tree. For the layout to work,
every ancestor must have an explicit height:

```
html, body  →  height: 100vh  (set by terriajs global.scss)
  #ui       →  height: 100%   (set by our global.scss override)
    .ui-root →  height: 100%  (set by terriajs styled-components)
```

The `#ui { height: 100% }` rule in `lib/Views/global.scss` is critical. Without it,
`#ui` has no intrinsic height and the entire UI collapses to 0px.

In embedded mode, the host app's container div provides the height instead of `#ui`.

## Standalone vs Embedded Mode

The entry point (`entry.js`) auto-detects the mode:

- **Standalone** (`/twin/`): If `document.getElementById("ui")` exists, auto-mounts
  into it immediately. This is the normal TerriaMap behavior.
- **Embedded** (via Command app): No `#ui` in the host page, so nothing auto-mounts.
  The host calls `mountTwin(containerElement)` explicitly.

## Styled-Components Note

TerriaJS uses styled-components v6 which injects CSS via CSSOM `insertRule` in
production (speedy mode). The `<style>` tag's `textContent` appears empty, but CSS
rules exist in the CSSOM. This is normal — do not debug by checking `textContent`.

## Single Instance Limitation

Only one TerriaJS instance can be mounted at a time. Calling `mountTwin()` while
already mounted will tear down the previous instance first. This is by design —
TerriaJS uses many global singletons (Cesium viewer, clock, etc.).

## React 19 Status

A React 19 upgrade attempt is parked on branch `feat/react19-terria-embed`. It uses
a custom `terriajs-8.11.3.tgz` tarball built from the `metro-terriajs` repo.

**Blocked by:** Cesium `syncDataSourceCollection` crash when adding any data layer:
```
TypeError: Cannot read properties of undefined (reading 'length')
    at syncDataSourceCollection
```

This is a deep React 19 incompatibility in terriajs-cesium's data source management.
Upstream TerriaJS has not moved to React 19 either. We'll revisit when they do.

**To regenerate the terriajs tarball:**
```bash
cd <path-to>/metro-terriajs
npm pack
# produces terriajs-8.11.3.tgz (44MB)
```

## File Reference

| File | Purpose |
|------|---------|
| `entry.js` | Mount API exports + standalone auto-mount |
| `buildprocess/webpack.config.js` | Library export config (`window.LungsodTwin`) |
| `lib/Views/global.scss` | CSS height chain fix + TerriaJS overrides |
| `packages/command/.../DigitalTwin/index.tsx` | Consumer component (host app) |
| `wwwroot/index.ejs` | HTML template for standalone mode |
