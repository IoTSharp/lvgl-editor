# LvglEditor collaboration constraints

## Scope and target ownership

- This repository owns the visual editor, shared project model, target configuration, all three generators, resource conversion, diagnostics and export packaging. Stable IDs: `c-lvgl`, `lispbm-vesc`, `basic-iotembedded`.
- Preserve C/LVGL code and tests when integrating PR #3. LispBM/VESC is a peer target. BASIC generates layout and separate user event modules against HmiCraft's versioned HMI contract; generation does not establish runtime or hardware acceptance.
- Standalone defaults to C. HmiCraft's own device entry defaults to BASIC. Hosts may restrict allowed targets and switching. New-project, settings, save/open, recovery, preview and every export entry use the same target contract. Unknown, disabled, incompatible and unsupported functionality produces located diagnostics and blocks export.
- Separate handwritten C/Lisp/BASIC from generated files; retain each language's modules across switching, regeneration and renaming. Do not silently translate, overwrite or discard user logic. Keep stable component IDs and source maps.
- Work independently of HmiCraft source/services. Hosts own profiles, runtime integration, transport and device acceptance. IoTEmbedded owns generic MCU/RTOS/BSP, drivers and BASIC. Do not duplicate those implementations here or connect/flash/write PLC values from a generator.
- Canvas visuals, files, compilation, script execution and hardware evidence are separate states. Missing runtime/API/resource support remains an acceptance gate. Preserve upstream attribution and review source/resource/WASM rights before distribution; no guessed license, customer secrets or unauthorized assets.

- C must use the common backend. Platform integration is a configuration axis within `c-lvgl`: legacy-compatible `generic`, STM32CubeMX/CubeIDE HAL `stm32cube-hal`, and standard RT-Thread BSP/SCons `rt-thread-scons`. Persist/reopen/export the profile. This increment provides directory/adapter contracts, not a specific .ioc/BSP, target build or board acceptance. Initial BASIC source maps do not prove C/Lisp mapping.

## Documentation and validation

- `README.md` is English; synchronize `README.zh-CN.md` and `README.ru.md` in capabilities, limits and evidence. Maintain English `ROADMAP.md` and Chinese `ROADMAP.zh-CN.md` with identical task IDs/statuses; update revisions and run `node scripts/check-docs-sync.mjs` together.
- UI defaults to English and offers Chinese/Russian switching. UI implementation/coverage and README translation are separately verified. Do not remove Chinese or Russian support when integrating upstream patches.
- Update roadmap, changelog and integration handoff when behavior or acceptance boundaries change. Retain historical failures and later fixes separately. A `build:web` bundle does not replace TypeScript checking in `build`.
- Run relevant Vitest cases and a complete build. Record C toolchain skips explicitly. Browser changes require new/settings/save/reopen/switch/export journeys; scripts and boards require independent evidence.
- Validate and commit this repository independently. HmiCraft updates its gitlink only to a committed, retrievable revision. Uncommitted changes are not reproducible dependencies.

## Inherited machine safety

- Use `C:\Program Files\PowerShell\7\pwsh.exe`; verify major version >=7. Never start Windows PowerShell 5.1.
- Bound loops/searches/retries/waits by item/iteration counts and wall-clock deadlines with cancellation/progress. Review comparison-based exit conditions and trial generated loops on tiny input.
- Use the host bounded process helper for long commands. Record PID, start time, command and parent chain. Reclaim only verified owned trees/files; never kill by name or clear shared temporary/cache directories.
- Discover tools through PATH, explicit configuration or fixed paths; no recursive scans of drive roots, profiles or Program Files. No native Windows GCC is installed. Use configured GNU environments when required; install tools only with authorization.
- Never use/install/rebuild Graphify or `graphify-out`. Internet failures may use per-request `http://127.0.0.1:7890`; leave internal routing intact.
- Bash over SSH must use a single-quoted PowerShell here-string and `C:\Users\mysti\.codex\skills\usm-gateshell-ssh\scripts\invoke-ssh-bash.ps1`; no expandable remote script strings or partial backtick escaping.
- Delegate non-overlapping paths and repeat bounds/process ownership/cleanup in agent prompts. Preserve unrelated dirty changes and stage only owned files.
