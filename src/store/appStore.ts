// Application-level state store

import { create } from 'zustand';
import { resolveHostTarget, resolveCIntegrationProfile, type TargetId, type CIntegrationProfileId } from '../output';

export type AppView = 'projectList' | 'editor';

/**
 * Extract pixel font size from a defaultFont identifier.
 * Built-in: "montserrat_14" → 14
 * Custom font: uses explicit defaultFontSize if provided, else first size from FontResource.sizes.
 * Fallback: 14
 */
export function parseFontSize(defaultFont: string, customFontSizes?: number[], defaultFontSize?: number): number {
  const builtinMatch = defaultFont.match(/^montserrat_(\d+)$/);
  if (builtinMatch) return parseInt(builtinMatch[1], 10);
  if (defaultFontSize !== undefined) return defaultFontSize;
  if (customFontSizes && customFontSizes.length > 0) return customFontSizes[0];
  return 14;
}

interface AppState {
  currentView: AppView;
  currentProjectId: string | null;
  showProjectSettings: boolean;
  lastSaveTime: number | null;
  /** Default font size derived from project lvglConfig.defaultFont */
  defaultFontSize: number;
  outputTarget: TargetId;
  cIntegrationProfile: CIntegrationProfileId;
  setCIntegrationProfile: (profile: CIntegrationProfileId) => void;
  setOutputTarget: (target: TargetId) => void;

  setView: (view: AppView) => void;
  setCurrentProjectId: (id: string | null) => void;
  setShowProjectSettings: (show: boolean) => void;
  setLastSaveTime: (time: number) => void;
  setDefaultFontSize: (size: number) => void;
  goToProjectList: () => void;
  openProject: (id: string, target?: TargetId, cIntegrationProfile?: CIntegrationProfileId) => void;
}

export const useAppStore = create<AppState>((set) => ({
  currentView: 'projectList',
  currentProjectId: null,
  showProjectSettings: false,
  lastSaveTime: null,
  defaultFontSize: 14,
  outputTarget: 'c-lvgl',
  cIntegrationProfile: 'generic',
  setCIntegrationProfile: (profile) => set({ cIntegrationProfile: resolveCIntegrationProfile(profile) }),
  setOutputTarget: (target) => set({ outputTarget: resolveHostTarget(target) }),

  setView: (view) => set({ currentView: view }),
  setCurrentProjectId: (id) => set({ currentProjectId: id }),
  setShowProjectSettings: (show) => set({ showProjectSettings: show }),
  setLastSaveTime: (time) => set({ lastSaveTime: time }),
  setDefaultFontSize: (size) => set({ defaultFontSize: size }),

  goToProjectList: () => {
    set({ currentView: 'projectList', currentProjectId: null, lastSaveTime: null });
    localStorage.removeItem('lastOpenProjectId');
  },

  openProject: (id, target, profile) => {
    const outputTarget = resolveHostTarget(target);
    const cIntegrationProfile = resolveCIntegrationProfile(profile);
    set({ currentView: 'editor', currentProjectId: id, outputTarget, cIntegrationProfile });
    localStorage.setItem('lastOpenProjectId', id);
  },
}));
