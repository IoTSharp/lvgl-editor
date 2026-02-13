// Application-level state store

import { create } from 'zustand';

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

  setView: (view: AppView) => void;
  setCurrentProjectId: (id: string | null) => void;
  setShowProjectSettings: (show: boolean) => void;
  setLastSaveTime: (time: number) => void;
  setDefaultFontSize: (size: number) => void;
  goToProjectList: () => void;
  openProject: (id: string) => void;
}

export const useAppStore = create<AppState>((set) => ({
  currentView: 'projectList',
  currentProjectId: null,
  showProjectSettings: false,
  lastSaveTime: null,
  defaultFontSize: 14,

  setView: (view) => set({ currentView: view }),
  setCurrentProjectId: (id) => set({ currentProjectId: id }),
  setShowProjectSettings: (show) => set({ showProjectSettings: show }),
  setLastSaveTime: (time) => set({ lastSaveTime: time }),
  setDefaultFontSize: (size) => set({ defaultFontSize: size }),

  goToProjectList: () => {
    set({ currentView: 'projectList', currentProjectId: null, lastSaveTime: null });
    localStorage.removeItem('lastOpenProjectId');
  },

  openProject: (id) => {
    set({ currentView: 'editor', currentProjectId: id });
    localStorage.setItem('lastOpenProjectId', id);
  },
}));
