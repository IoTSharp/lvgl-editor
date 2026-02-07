# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

LVGL UI Editor — a browser-based visual editor for designing LVGL (Light and Versatile Graphics Library) embedded GUIs. Users drag-and-drop LVGL components onto a canvas, configure properties/events, wire up logic flows, and export C code ready for embedded targets.

The UI is in Chinese (zh-CN). All user-facing strings, prompts, and labels are in Chinese.

## Commands

```bash
npm run dev        # Start dev server at http://localhost:5173 (binds 0.0.0.0)
npm run build      # TypeScript check + Vite production build (tsc -b && vite build)
npm run lint       # ESLint (flat config, TS + React rules)
npm run preview    # Preview production build locally
```

No test framework is configured. There are no unit or integration tests.

## Tech Stack

- React 19 + TypeScript 5.9, Vite 7, ESLint flat config
- **State**: Zustand 5 (three independent stores)
- **Drag-and-drop**: @dnd-kit/core + @dnd-kit/sortable
- **Logic editor**: @xyflow/react 12 (React Flow)
- **Code editors**: @monaco-editor/react
- **Zip export**: jszip

## Architecture

### Application Tabs

`App.tsx` renders four top-level tabs that switch the main content area:
- **Design** (`设计`) — three-column layout: ComponentPanel | Canvas + AlignToolbar + PageManager | PropertyEditor + EventPanel
- **Logic** (`逻辑`) — full-panel LogicEditor (React Flow node graph)
- **Code** (`代码`) — full-panel CodePreview (Monaco editor showing generated C)
- **Preview** (`预览`) — full-panel PreviewPanel (HTML5 Canvas simulation of LVGL rendering)

### Three Zustand Stores

1. **`useEditorStore`** (`src/store/editorStore.ts`) — the main store. Manages pages, components (as a recursive tree via `LvglComponent.children`), canvas state, selection, drag, undo/redo history (50 entries), and alignment guides. All component mutations operate on the current page's component tree using recursive helper functions (`findComponentInTree`, `updateComponentInTree`, `deleteComponentFromTree`, `addComponentToTree`).

2. **`useLogicEditorStore`** (`src/components/LogicEditor/logicEditorStore.ts`) — manages logic graphs, nodes, connections, variables, and debug state. Completely independent from the editor store.

3. **`useResourceStore`** (`src/resources/resourceStore.ts`) — manages uploaded images, fonts, and icons.

### Component Tree Model

Components are stored as a recursive tree (`LvglComponent[]` where each has a `children: LvglComponent[]`). Container components can nest children. The tree is always scoped to the current page (`pages[currentPageId].components`).

### Type System

- `src/types/index.ts` — core types: `LvglComponent`, `Page`, `EventBinding`, `CanvasState`, `StyleProps`, etc.
- `src/components/LogicEditor/types.ts` — logic editor types: `LogicNode`, `LogicGraph`, `LogicConnection`, `LogicVariable`, port types
- `src/codegen/types.ts` — code generation options and output types
- `src/resources/types.ts` — resource types (images, fonts, icons, project file format)

### Code Generation Pipeline

`src/codegen/` generates LVGL C code from the editor state:
- `generator.ts` — orchestrator, calls individual template generators
- `templates/ui.h.ts`, `ui.c.ts` — UI component declarations and initialization
- `templates/ui_events.h.ts`, `ui_events.c.ts` — event handler code
- `templates/ui_logic.h.ts`, `ui_logic.c.ts` — logic function stubs (placeholder)
- `formatters/cFormatter.ts` — C code formatting
- `utils/nameUtils.ts` — C-safe name generation

Output files: `ui.h`, `ui.c`, `ui_events.h`, `ui_events.c`, `ui_logic.h`, `ui_logic.c`

### Global Notification Systems

`Toast` and `Modal` use the same pattern: module-level state with a listener set, exported as imperative APIs (`toast.success(...)`, `modal.confirm(...)`) that return Promises. The React components subscribe to the module state. This avoids prop-drilling and works from anywhere including non-React code.

- `toast` — imported from `src/components/Toast`, provides `success`, `error`, `warning`, `info`
- `modal` — imported from `src/components/Modal`, provides `alert`, `confirm`, `prompt`

### Project Persistence

- Projects save/load as `.lvgl.json` files via `src/resources/projectManager.ts`
- Auto-save to `localStorage` every 30 seconds; restore prompt on startup
- Project file version is `1.0.0` with migration support

### Keyboard Shortcuts

Handled globally by `src/hooks/useKeyboardShortcuts.ts`. Communicates with `App.tsx` via `CustomEvent` dispatches on `window` (e.g., `toggle-help-panel`, `save-project`). The clipboard is stored as a module-level variable (not in any store), so it does not persist across page reloads.

### Component Definitions

`src/utils/componentDefinitions.ts` defines all 16 LVGL component types (button, label, slider, etc.) with their default sizes, props, styles, and category groupings.

## Key Patterns

- Components use barrel exports (`index.ts` in each component directory)
- CSS is co-located with components (e.g., `Canvas.tsx` + `CanvasComponent.css`)
- The Vite config uses manual chunks to split Monaco, React Flow, dnd-kit, React, and Zustand into separate bundles
- IDs are generated with `uuid` v4 throughout
- `HierarchyPanel` and `CodePanel` components exist but are not currently wired into `App.tsx`

## Known Limitations

- Logic-to-C code generation is incomplete (logic graph templates are stubs)
- No test suite exists
- Image resources show as placeholders in the preview panel
- Animation editor is not implemented
