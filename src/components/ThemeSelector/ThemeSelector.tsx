import { t } from '../../i18n';
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
        title={t("当前主题: {0}", preset === 'light' ? t('Light theme') : preset === 'dark' ? t('Dark theme') : currentTheme.name)}
      >
        <option value="light">{t("☀️ 浅色")}</option>
        <option value="dark">{t("🌙 深色")}</option>
      </select>
    </div>
  );
};

export default ThemeSelector;
