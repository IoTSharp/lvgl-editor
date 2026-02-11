import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import type { Theme, ThemePreset, ThemeColors } from '../types';

const lightTheme: Theme = {
  id: 'light',
  name: '浅色主题',
  colors: {
    primary: '#2196F3',
    secondary: '#03A9F4',
    background: '#ffffff',
    surface: '#f5f5f5',
    text: '#333333',
    border: '#e0e0e0',
  },
};

const darkTheme: Theme = {
  id: 'dark',
  name: '深色主题',
  colors: {
    primary: '#90CAF9',
    secondary: '#4FC3F7',
    background: '#121212',
    surface: '#1e1e1e',
    text: '#e0e0e0',
    border: '#333333',
  },
};

const presetThemes: Record<string, Theme> = {
  light: lightTheme,
  dark: darkTheme,
};

interface ThemeState {
  currentTheme: Theme;
  preset: ThemePreset;
  customThemes: Theme[];
  setTheme: (preset: ThemePreset, customId?: string) => void;
  createCustomTheme: (name: string, colors: ThemeColors) => Theme;
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  currentTheme: lightTheme,
  preset: 'light',
  customThemes: [],

  setTheme: (preset, customId) => {
    if (preset === 'custom' && customId) {
      const custom = get().customThemes.find(t => t.id === customId);
      if (custom) {
        set({ currentTheme: custom, preset: 'custom' });
      }
    } else if (presetThemes[preset]) {
      set({ currentTheme: presetThemes[preset], preset });
    }
  },

  createCustomTheme: (name, colors) => {
    const theme: Theme = { id: uuidv4(), name, colors };
    set(state => ({ customThemes: [...state.customThemes, theme] }));
    return theme;
  },
}));

/**
 * 根据当前主题返回新建组件的默认样式覆盖
 */
export function getThemeDefaultStyles(theme: Theme) {
  return {
    default: {
      bgColor: theme.colors.surface,
      borderColor: theme.colors.border,
      textColor: theme.colors.text,
    },
  };
}
