// Application-level state store

import { create } from 'zustand';

export type AppView = 'projectList' | 'editor';

interface AppState {
  currentView: AppView;
  currentProjectId: string | null;
  showProjectSettings: boolean;
  lastSaveTime: number | null;

  setView: (view: AppView) => void;
  setCurrentProjectId: (id: string | null) => void;
  setShowProjectSettings: (show: boolean) => void;
  setLastSaveTime: (time: number) => void;
  goToProjectList: () => void;
  openProject: (id: string) => void;
}

export const useAppStore = create<AppState>((set) => ({
  currentView: 'projectList',
  currentProjectId: null,
  showProjectSettings: false,
  lastSaveTime: null,

  setView: (view) => set({ currentView: view }),
  setCurrentProjectId: (id) => set({ currentProjectId: id }),
  setShowProjectSettings: (show) => set({ showProjectSettings: show }),
  setLastSaveTime: (time) => set({ lastSaveTime: time }),

  goToProjectList: () => {
    set({ currentView: 'projectList', currentProjectId: null, lastSaveTime: null });
    localStorage.removeItem('lastOpenProjectId');
  },

  openProject: (id) => {
    set({ currentView: 'editor', currentProjectId: id });
    localStorage.setItem('lastOpenProjectId', id);
  },
}));
