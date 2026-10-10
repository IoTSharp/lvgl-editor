# PR #3 revision verification — 2026-10-11

The reviewed implementation keeps the main C/LVGL generator and original tests, adopts PR #3's LispBM backend and required dependencies, and introduces BASIC layout/events and source packages. Original PR head: `3647ce025bc65cd14c968c1d329dc40d593f7e51`; main baseline: `0d0d62f655442dd5624a00390b7652222a7b3fc8`. Unreviewed canvas/resource rewrites were deferred. Formal remote merge is recorded separately after GitHub readback.

## Final local checks

| Check | Result | Boundary |
|---|---|---|
| Complete Vitest suite | 509 passed, 48 skipped; exit 0 | The 48 emcc/LVGL compilation cases require explicitly configured paths and `LVGL_COMPILE_VERIFY=1` |
| `npm run build` | exit 0 | Includes `tsc -b` and Vite; bundle-size warning remains |
| Synchronized documentation | exit 0 | Three README languages, two roadmap languages, identical revisions and task states |
| Browser C integration profiles | generic, STM32Cube HAL and RT-Thread SCons ZIP downloads passed | Directory/contracts only; no concrete Cube/BSP build |
| Browser three-target sample | C, Lisp and BASIC source ZIP exports and project JSON saves passed | Two controls, built-in text update and independent handwritten event slots |
| Browser language/reopen | English, Chinese and Russian switching without reload; BASIC target restored after reload | User project text and all three code slots retained |
| Independent ZIP inspection | Nine packages passed path, byte-length and SHA256 checks | Includes three exports from the final production build; C stable-ID references match declarations |

The shared input is [samples/three-targets.lvgl.json](../samples/three-targets.lvgl.json). Default standalone language is English and output is C; hosts can configure the BASIC default through `window.LVGL_EDITOR_OPTIONS`. HmiCraft's actual host mounting and device runtime remain roadmap work.

Located validation now blocks unsupported BASIC widgets/styles/graphs/resources, missing target-specific code, unavailable Lisp fonts, incompatible explicit Lisp LVGL versions, unsafe or colliding resource symbols/paths, ambiguous references and C declaration collisions. Regression tests verify stable-ID references resolve to actual C declarations under both naming styles, and custom→builtin→custom event editing retains inactive language slots.

## Evidence and limits

On the integration host, bounded process receipts are retained under `D:\source\HMIlStudio\artifacts\process\`: `pr3-final-contracts-20261011-r3`, `pr3-final-production-build-20261011-r4`, `pr3-final-locales-20261011-r4`, `pr3-browser-c-profiles-20261011`, `pr3-browser-three-targets-20261011`, `pr3-browser-locales-reopen-20261011`, `pr3-production-browser-journey-20261011-r3`, and `pr3-package-roundtrip-20261011-r3`. Screenshots and downloaded files are retained under `artifacts/pr3-browser`. The production journey confirms the English/C defaults, all three exports, two rendered controls, locale changes without reload and BASIC target/code retention after reload. The last tooltip-only locale changes were followed by a successful complete build and 3 locale tests; duplicate Russian dictionary keys briefly failed TypeScript checking before correction. Logs are local evidence, not repository dependencies.

Historical TypeScript/font failures and intermediate failures remain retained. The first package-audit script incorrectly matched `C_USER_KEEP` inside `BASIC_USER_KEEP`; later runs check token boundaries and pass. Production browser setup first lost its detached daemon to automatic child cleanup; a subsequent card click reported detachment after the editor had opened. The fresh snapshot and continuation verify the resulting editor state; those failed receipts are retained separately. Browser server lifetime expiry is recorded separately from the successful journeys; named browser sessions and owned server processes are reclaimed by identity.

Every generated bundle is `source-contract` and `deployable=false`. BASIC uses `hmicraft-hmi-basic/1-draft`; HmiCraft HMI APIs and nested-import package loading are not registered in IoTEmbedded. BASIC image/font conversion, graphs, animation and variable binding remain unsupported. C custom fonts still require external conversion. BASIC has initial source maps; C/Lisp maps remain empty.

No pinned-LVGL native/emcc compilation, STM32 `.ioc`/CubeIDE build, RT-Thread BSP/SCons target build, LispBM bridge/script execution, IoTEmbedded BASIC runtime consumption, device transfer, firmware update, PLC write, physical board or industrial acceptance was performed. Windows browser checks do not establish Linux/macOS desktop acceptance. Public source, licensing, releases and hardware acceptance remain separate decisions.
