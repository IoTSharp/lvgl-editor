# LvglEditor roadmap: one designer, three outputs

[English](ROADMAP.md) · [简体中文](ROADMAP.zh-CN.md)

<!-- docs-sync: family=roadmap revision=2026-10-11.4 -->

Updated: 2026-10-11. LvglEditor owns visual design and C/LVGL, LispBM/VESC and BASIC/IoTEmbedded outputs. Hosts such as HmiCraft select a target at initialization and consume generated artifacts. The user authorized revising and merging PR #3 while retaining C and adding BASIC. This increment starts basic BASIC layout/event generation, the package contract and target selection in New Project/Project Settings. Implementation, verification and remote merge receipts are recorded separately; device paths are not accepted yet.

States: `planned` means not implemented; `partial` means a defined subset exists with remaining gates; `done-doc` means documentation completed, not runtime or hardware acceptance; `done-local` refers only to the explicitly recorded local evidence.

## Ownership

| Owner | Responsibilities |
|---|---|
| LvglEditor core | Canvas/properties/resources/events/logic, versioned model, initialization, target registry, capabilities, diagnostics, user-code protection and output contract |
| Three LvglEditor backends | Generation, event/logic mapping, resource conversion, manifests/packaging and generator tests, all maintained here |
| Hosts including HmiCraft | Select allowed/default targets, supply versioned device/API profiles, adapt old projects, consume outputs, manage products/transport/debugging and acceptance |
| Target firmware/runtime | LVGL/BSP for C; LispBM/LVGL bridge for VESC; IoTEmbedded + HmiCraft BASIC/HMI APIs, drivers and package loading |

The editor runs independently and preserves C compatibility. Script backends use versioned contracts without importing host source or requiring HmiCraft services. Generation does not connect to devices or control them. Hosts do not implement duplicate UI generators.

## Initialization and persistence contract

The following is the design shape; actual entry points and this increment's scope follow source and verification receipts. GEN-01/10 track host mounting.

```ts
const editorOptions = {
  output: {
    defaultTarget: "basic-iotembedded",
    allowedTargets: ["basic-iotembedded"],
    allowTargetSwitch: false,
    profile: basicDeviceProfile, // Host-selected, versioned device/API capabilities
  },
};
```

- Stable IDs: `c-lvgl`, `lispbm-vesc`, `basic-iotembedded`. Standalone defaults to C; HmiCraft's own device entry initializes BASIC. New Project and Project Settings use the same configuration. Hosts may limit allowed targets and switching.
- Validate a nonempty allowed list, default membership, target availability and profile/target/LVGL/runtime compatibility. Unknown/unimplemented/conflicting requests fail explicitly rather than falling back silently.
- An unconfigured legacy entry preserves C. Available, pending and incompatible targets are distinct; displaying an option is not support evidence.
- Persist target ID, profile ID/version, editor schema and user code per language. Reopening requests the saved target and checks host restrictions; conflicts preserve the original document and code, including recovery.
- Switch only by an explicit user action when permitted. Diagnose unsupported controls/events/code and retain other language modules. Handwritten C/Lisp/BASIC is not translated automatically.
- Use this contract in create/import/recovery/preview/download/bulk export; changing a code label alone is insufficient.
- Output carries target/profile/schema/generator versions, text/binary files, resources, diagnostics and source maps. Errors must not produce a deployable success result. Diagnostics can remain available for editing.
- Generation/packaging, target compilation, physical transfer and execution belong to explicit adapters/hosts and have separate results.

## Target outputs

| Target | Artifacts | Runtime dependency | First complete path |
|---|---|---|---|
| C/LVGL | C/headers, event/logic code, image/font resources and integration manifest | Pinned LVGL and BSP/toolchain | Retain C workflow, compile output and validate UI/events |
| LispBM/VESC | Lisp layout/events/logic, resources and target manifest | Pinned LispBM, VESC firmware, LVGL bridge/API and resource formats | Extract reviewed PR #3 backend, load scripts/resources and record specific device evidence |
| BASIC/IoTEmbedded | BASIC layout, user event modules, resources/index and design manifest | IoTEmbedded BASIC + HmiCraft HMI/package APIs | Generate against versioned profile/API; HmiCraft consumes it in host runtime then a board |

The model retains stable object IDs, hierarchy/layout/styles, variables, base actions, events and resources. Map shared actions per target and label target-specific capabilities. Separate generated layout and user modules across regeneration, rename and target switches. Missing capabilities or exceeded budgets cause diagnostics.

## Tasks and acceptance

| ID | Owner | Deliverable | State | Acceptance/dependencies |
|---|---|---|---|---|
| GEN-00 | Baseline maintenance | Type/font regressions and runnable tests | partial | Historical type failure, 4 font failures and bundle success remain; reproduce/fix, configure C compile environment, do not bypass type checking |
| GEN-01 | Public API | Initialization, target registry and one output entry | partial | Legacy C default; three targets and unknown/disabled/profile conflicts; create/open/recover/preview/export share configuration |
| GEN-02 | Project model | Language-independent model and versioned profiles | partial | Stable IDs/events/variables/resources/capabilities; schema migration and unknown-item diagnostics; no instance cross-talk; GEN-01 |
| GEN-03 | C backend | Retain C through shared interface | partial | C retained behind the unified backend; local tests/types/build and browser ZIP downloads for three C profiles passed. All 48 toolchain-dependent C compilation cases were skipped; pinned LVGL/target builds and hardware remain unverified; GEN-00/01/02 |
| GEN-04 | LispBM backend | LispBM/VESC generation and packaging | partial | Pin PR #3 head; reviewed backend/dependencies retain C tests/Chinese/other targets; freeze bridge/API/resources; script/device evidence separately; GEN-01/02/06/07 |
| GEN-05 | BASIC backend | BASIC/IoTEmbedded generation and design package | partial | Freeze HmiCraft API/package/profile; deterministic layout/events/user scripts/resources; HmiCraft validates host runtime/device; GEN-01/02/06/07 |
| GEN-06 | Resources/output | Shared processing and per-target packaging | partial | Formats/budgets for images/fonts/animation; versions/hashes/relative paths/maps; no deployable output on errors; reproducible inputs; GEN-02 |
| GEN-07 | Code/events | Per-target language and user modules | partial | C/Lisp/BASIC editor matches target; action mapping; save/reopen/switch/regenerate preserve code; unsupported nodes diagnosed; GEN-02 |
| GEN-08 | Preview | Per-target preview contract | planned | Distinguish Canvas, C/WASM, script runtime and boards; report verified layer when runtime absent; matching artifacts/events/resources; GEN-03/04/05 |
| GEN-09 | Verification | Shared three-target sample and capability matrix | partial | 509 passed/48 C compile skipped; two-control sample with built-in event and separate code slots exported ZIP/JSON for three targets, locale switching/BASIC recovery and six ZIP metadata checks passed. Broad resources, target runtime/events and boards remain unverified; see verification-pr3-2026-10-11; GEN-03/04/05/08 |
| GEN-10 | Host interface | Embedding and HmiCraft initialization | partial | Mock host configures each implemented target and receives result/diagnostics; HmiCraft BASIC profile/receipt; independent of host source; GEN-01/02/06 |
| GEN-11 | Merge maintenance | PR #3 revision, provenance and formal merge receipt | partial | Fixed head `3647ce025bc65cd14c968c1d329dc40d593f7e51`, base `0d0d62f655442dd5624a00390b7652222a7b3fc8`; authorized revision then merge; retain C/tests, add BASIC; verify checks, retrievable commits and GitHub merge state separately; GEN-00/01/03/04/05 |
| GEN-12 | Docs/UI | Three README languages, two roadmap languages and UI locales | partial | README en/zh/ru and roadmap en/zh share revision/capabilities; check IDs/statuses/links; UI defaults English, Chinese/Russian switching/persistence and create/settings/diagnostic/export text separately verified; docs are not full UI coverage |
| GEN-13 | C backend/profiles | STM32CubeMX/CubeIDE HAL and RT-Thread BSP/SCons profiles | partial | Common C backend with persisted/exported `cIntegrationProfile`: `generic` default, `stm32cube-hal`, `rt-thread-scons`; STM32 Core/Src/hmi and Core/Inc/hmi, RT applications/hmi + SConscript, integration-contract.json. Profile persistence/directories/export contract implemented; local checks and browser ZIP downloads for all three C profiles passed; specific .ioc/BSP/toolchain builds and boards remain unverified; GEN-01/02/03/06/09 |

Sequence: GEN-00 → GEN-01/02 → GEN-03 retains C. GEN-06/07 support independent GEN-04/05 script paths. GEN-10 verifies host initialization; GEN-08/09 complete per-target preview/execution evidence. Each output has its own completion criteria.

The common sample should include container, button, text, numeric/progress display, Boolean status, image/font, navigation and timer/variable events. Record each target's native mappings; insufficient capabilities reject export instead of a successful empty implementation.

## Cross-repository delivery

- This roadmap owns implementation. HmiCraft OUT/LVE/HMI tasks map editor deliverables to host/device acceptance without duplicate generators.
- Commit source/docs/verification here independently. Only then can HmiCraft pin a retrievable gitlink. Dirty submodule contents are not fixed/released dependencies.
- Review PR #3 common canvas/resource changes and LispBM separately; formally merge the revision under user authorization. Until remote readback, record only local integration. PR #2 is independently reviewed and not accepted by implication.
- Record builds, output generation, target compilation, scripts and hardware separately. README/version badges do not replace evidence.

## This increment and remaining gates

1. Pin PR #3 provenance, retain C code/docs/tests, and integrate LispBM with required dependencies. Standalone default C; HmiCraft device default BASIC.
2. Share target selection across create/settings and retain per-language code through persistence/recovery. Start basic BASIC layout/events and package contract. Diagnose unsupported items and block export.
3. Synchronize facade/roadmaps/AGENTS; verify English-default UI and Chinese/Russian switching independently of README translation.
4. After full types/tests/build and browser journeys, record submodule commit/formal merge receipts; parent pins only retrievable SHA. Retain original failures.
5. Continue BASIC runtime/API consumption, complete resource conversion, target compilation/scripts, boards and product delivery separately. Initial generation does not close these tasks.
6. Normalize C behind the common backend. GEN-13 first delivers STM32CubeMX/CubeIDE HAL and RT-Thread BSP/SCons profile persistence/directories/contracts; `generic` preserves old projects. Concrete .ioc/BSP builds and boards have later acceptance gates.

## Local verification snapshot — 2026-10-11

Vitest: **509 passed / 48 C compilation tests skipped**. The actual `npm run build` (TypeScript `tsc -b` plus Vite) exited **0**. Browser ZIP and project JSON exports passed for C, LispBM and BASIC on a two-control sample with a built-in event and independent language code slots. English/Chinese/Russian switching without reload and BASIC save/reload recovery passed. All six ZIPs passed independent path, byte-length and SHA256 checks. Formal remote PR merge is still pending; GEN-09 remains partial because this is small-sample source-package evidence, not broad resources, target runtime or hardware acceptance.

See the [verification report](docs/verification-pr3-2026-10-11.md) and [shared sample](samples/three-targets.lvgl.json). Pinned LVGL/.ioc/BSP compilation, LispBM bridge/script execution, IoTEmbedded BASIC consumption, device transfer and industrial acceptance remain unverified. Historical failures are retained.
