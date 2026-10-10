# LvglEditor

[English](README.md) · [简体中文](README.zh-CN.md) · [Русский](README.ru.md)

<!-- docs-sync: family=readme revision=2026-10-11.4 -->
<!-- output-status: c-lvgl=partial;lispbm-vesc=partial;basic-iotembedded=partial;device=unverified -->

A visual LVGL interface editor with one project model and three output targets: **C/LVGL**, **LispBM/VESC**, and **BASIC/IoTEmbedded**. The editor owns design, generation, resource conversion, target validation and export packaging. Hosts such as HmiCraft choose a target/device/API profile and consume the result.

PR [#3](https://github.com/IoTSharp/lvgl-editor/pull/3) contributes the LispBM/VESC route. Its integration preserves the C workflow and tests and adds BASIC. Work is in progress; source integration, generation, compilation, script execution and real devices have separate acceptance criteria. See the [English roadmap](ROADMAP.md), [Chinese roadmap](ROADMAP.zh-CN.md) and [project constraints](AGENTS.md).

## Output targets

| Target ID | Output | Acceptance boundary |
|---|---|---|
| `c-lvgl` | C headers/source, events/logic and target resources | Unified source contract locally verified; target compilation remains unverified |
| `lispbm-vesc` | Lisp layout/events and resources for a versioned VESC/LVGL bridge | PR #3 integration; not every VESC firmware provides the required APIs |
| `basic-iotembedded` | Generated BASIC layout, separate user event modules, resources and package manifest | First increment: basic layout/event generation and package contract; HmiCraft runtime consumption and board acceptance remain separate |

Choose a target in **New Project**, or change it in **Project Settings** if the host allows switching. Standalone defaults to C; HmiCraft's own device entry defaults to BASIC. Saved projects must retain target/profile and user modules for each language. Handwritten C/Lisp/BASIC is not automatically translated. Switching, regeneration, renaming, save/open and recovery must preserve user logic. Unsupported functionality or incompatible profiles produce located diagnostics and block export; an empty implementation is not a successful result. Implementation states are tracked in GEN-01/02/07/09/10.

The React/TypeScript workbench provides a palette, canvas, hierarchy/properties, pages, events, React Flow graphs, Monaco, resources and project persistence. Canvas is visual preview; C/WASM and script execution require matching adapters. HmiCraft owns profiles, HMI runtime, loading/deployment and device acceptance. IoTEmbedded owns generic MCU/RTOS/BSP, drivers and BASIC. Generators must work independently of HmiCraft source/services and must not connect to devices, flash firmware or write PLC values.

## Development and verification

Use the lockfile with compatible Node.js/npm: `npm ci`, then `npm run dev`. Vite prints the local URL. Run `npm run build`, `npm test` and `node scripts/check-docs-sync.mjs` for validation. `build` checks TypeScript before Vite; `build:web` only bundles and cannot replace it. Static hosting configures `VITE_ENABLE_COMPILE_PREVIEW=false` and deployment-specific `VITE_BASE_PATH`. Do not expose the development compiler service publicly. Toolchain-dependent C tests require configured LVGL/toolchain paths; record skips explicitly.

The historical **2026-10-10** baseline had a successful bundle, failed TypeScript checking and **386 passed / 4 failed** Vitest cases; environment-specific C compilation tests were not run. Retain failures alongside later fixes in [CHANGELOG](CHANGELOG.md) and the roadmap. No production or hardware acceptance follows from a build badge.

LVGL, runtime API, resource format, board/profile, editor schema and package format are versioned separately. Font conversion and packaging must match the target; a web build does not prove ABI compatibility. The UI is required to default to English and support Chinese/Russian switching; GEN-12 tracks implementation and complete UI verification separately from documentation translation.

## Documentation and distribution

English is the facade; three README files share revision/status, and English/Chinese roadmaps share all task IDs/statuses. Update all copies in one change and run the documentation check. Public source, a granted license, a release and device acceptance are separate states.

The original README stated MIT, but the fixed baseline lacks a repository-wide LICENSE. Source/resource/WASM rights and third-party notices need review; this change grants no new license. Preserve attribution and exclude customer credentials, private industrial logic and unauthorized assets from the public repository.

## First BASIC increment and API

The common API in [src/output/index.ts](src/output/index.ts) exposes `generateTargetSource(input)` for synchronous source preview and `generateTargetProject(input)` for asynchronous resources, hashes and manifests. `OutputBundle` in [types.ts](src/output/types.ts) carries target/files/issues/manifest/sourceMap and `deployable=false`; it is a source-contract artifact.

BASIC currently covers `obj`, `btn`, `label`, `slider`, `bar`, `switch`, `checkbox` with absolute pixel layout, basic default styles, `navigate/show/hide/enable/disable/setText/setValue` and user event modules. Graphs, bindings, animation, images/fonts and unsupported advanced styles block export. Files include `main.bas`, `generated/layout.bas`, `generated/events.bas`, `user/events.bas`, `api-contract.json`, `source-map.json` and `manifest.json`. `hmicraft-hmi-basic/1-draft` is not registered in IoTEmbedded; nested imports need the future HmiCraft loader. Generation does not complete runtime or device acceptance.

C/LVGL now has confirmed integration profiles under GEN-13: `cIntegrationProfile` defaults to `generic` for legacy compatibility and offers `stm32cube-hal` (STM32CubeMX/CubeIDE HAL) or `rt-thread-scons` (standard RT-Thread BSP/SCons). Profile selection is retained through save/reopen/export. The initial contract lays out STM32 `Core/Src/hmi` / `Core/Inc/hmi` or RT-Thread `applications/hmi` plus `SConscript`, with `integration-contract.json`; it provides no specific .ioc, BSP, completed target build or board proof. Profiles are a configuration axis inside `c-lvgl`, not additional output languages. BASIC has initial located source maps; C/Lisp source maps are currently empty and remain a later gate.

### Local verification snapshot — 2026-10-11

Vitest: **509 passed / 48 C compilation tests skipped**. The actual `npm run build` (TypeScript `tsc -b` plus Vite) exited **0**. Browser ZIP and project JSON exports passed for C, LispBM and BASIC on a two-control sample with a built-in event and independent language code slots. English/Chinese/Russian switching without reload and BASIC save/reload recovery passed. All six ZIPs passed independent path, byte-length and SHA256 checks. Formal remote PR merge is still pending; GEN-09 remains partial because this is small-sample source-package evidence, not broad resources, target runtime or hardware acceptance.

See the [verification report](docs/verification-pr3-2026-10-11.md) and [shared sample](samples/three-targets.lvgl.json). Pinned LVGL/.ioc/BSP compilation, LispBM bridge/script execution, IoTEmbedded BASIC consumption, device transfer and industrial acceptance remain unverified. Historical failures are retained.
