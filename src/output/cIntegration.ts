import type { OutputBundle } from './types';

export type CIntegrationProfileId = 'generic' | 'stm32cube-hal' | 'rt-thread-scons';
export const C_INTEGRATION_PROFILES = [
  { id: 'generic' as const, label: 'Generic C / LVGL' },
  { id: 'stm32cube-hal' as const, label: 'STM32CubeMX / CubeIDE HAL' },
  { id: 'rt-thread-scons' as const, label: 'RT-Thread BSP / SCons' },
];
export function resolveCIntegrationProfile(value?: unknown): CIntegrationProfileId {
  if (value === undefined) return 'generic';
  if (C_INTEGRATION_PROFILES.some(p => p.id === value)) return value as CIntegrationProfileId;
  throw new Error(`Unknown C integration profile: ${String(value)}`);
}
export function cArtifactPath(path: string, profile: CIntegrationProfileId): string {
  if (profile === 'stm32cube-hal') {
    if (path.endsWith('.c')) return `Core/Src/hmi/${path}`;
    if (path.endsWith('.h')) return `Core/Inc/hmi/${path}`;
  }
  if (profile === 'rt-thread-scons' && /\.[ch]$/.test(path)) return `applications/hmi/${path}`;
  return path;
}
export function applyCIntegration(bundle: OutputBundle, value?: unknown): void {
  const profile = resolveCIntegrationProfile(value);
  if (bundle.target !== 'c-lvgl') return;
  bundle.manifest.cIntegrationProfile = profile;
  const remapped: OutputBundle['files'] = {};
  for (const [path, content] of Object.entries(bundle.files)) remapped[cArtifactPath(path, profile)] = content;
  bundle.files = remapped;
  bundle.sourceMap = bundle.sourceMap.map(entry => ({ ...entry, file: cArtifactPath(entry.file, profile) }));
  if (profile === 'generic') return;
  const lvglVersion = bundle.manifest.api.replace('lvgl/', '');
  const common = {
    schemaVersion: 1, target: 'c-lvgl', profile, status: 'integration-contract', deployable: false,
    lvglVersion, board: null, mcu: null, bsp: null, toolchainVersion: null,
    generatedEntryPoints: ['ui_init()', 'ui_logic_init()'],
    uiTask: 'Call initialization after lv_init() and display/input port registration. All generated events and normal LVGL calls must execute on the owning UI task.',
    tick: 'Integration supplies the selected LVGL version tick callback or lv_tick_inc() and periodic lv_timer_handler(). No board, IRQ or RTOS hook is generated.',
    limits: 'No board build, hardware behavior, BSP compatibility or memory/FPS acceptance has been performed.',
  };
  if (profile === 'stm32cube-hal') {
    bundle.files['integration-contract.json'] = JSON.stringify({ ...common,
      environment: 'Existing STM32CubeMX-generated STM32CubeIDE HAL project',
      includePaths: ['Core/Inc/hmi'], sourceDirectories: ['Core/Src/hmi'],
      integrationSteps: ['Import generated sources and headers into the existing CubeIDE project and add Core/Inc/hmi to C include paths.', 'Supply a compatible LVGL library/configuration and board-specific display/input/tick port.', 'Initialize ui_init() and ui_logic_init() in the existing UI task after LVGL/ports.', 'Update the owning Cube project build source list; retain CubeMX USER CODE boundaries.'],
      generatedBoardFiles: [], prerequisites: ['Existing .ioc/chip selection and HAL/BSP are supplied by the integrator.', 'This package contains no .ioc, startup, linker script, firmware entry point or complete CubeIDE project.'],
    }, null, 2) + '\n';
  } else {
    const sourceFiles = Object.keys(bundle.files).filter(path => path.endsWith('.c')).map(path => path.replace('applications/hmi/', '')).sort();
    bundle.files['applications/hmi/SConscript'] = [
      'from building import *', '', 'cwd = GetCurrentDir()',
      `src = ${JSON.stringify(sourceFiles)}`,
      'group = DefineGroup("HmiCraft", src, depend = [], CPPPATH = [cwd])',
      'Return("group")', '',
    ].join('\n');
    bundle.files['integration-contract.json'] = JSON.stringify({ ...common,
      environment: 'Existing standard RT-Thread BSP using SCons',
      includePaths: ['applications/hmi'], sourceDirectories: ['applications/hmi'],
      integrationSteps: ['Include applications/hmi/SConscript from the owning BSP/application SConscript.', 'Enable and configure the compatible LVGL package, include paths, configuration and display/input port in the existing BSP.', 'Initialize ui_init() and ui_logic_init() in the existing LVGL UI thread.', 'The integration owns SConstruct, Kconfig/menuconfig, RT-Thread configuration and BSP build.'],
      prerequisites: ['RT-Thread/BSP/SCons/toolchain versions must be selected and verified by the integrator.', 'No RT-Thread BSP, rtconfig.py, Kconfig, driver or complete standalone build is supplied.'],
    }, null, 2) + '\n';
  }
}
