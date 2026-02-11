import React from 'react';
import { useThemeStore } from '../../store/themeStore';
import type { ThemePreset } from '../../types';
import './ThemeSelector.css';

const ThemeSelector: React.FC = () => {
  const { preset, setTheme, currentTheme } = useThemeStore();

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setTheme(e.target.value as ThemePreset);
  };

  return (
    <div className="theme-selector">
      <span className="theme-selector-icon">🎨</span>
      <select
        className="theme-selector-select"
        value={preset}
        onChange={handleChange}
        title={`当前主题: ${currentTheme.name}`}
      >
        <option value="light">☀️ 浅色</option>
        <option value="dark">🌙 深色</option>
      </select>
    </div>
  );
};

export default ThemeSelector;
