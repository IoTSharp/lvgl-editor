import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { getLang, setLang, t } from '..';
import LanguageSwitcher from '../../components/LanguageSwitcher/LanguageSwitcher';

afterEach(() => { cleanup(); setLang('en'); });

describe('editor language selection', () => {
  it('starts in English independently of the browser locale', () => {
    expect(getLang()).toBe('en');
    expect(t('新建项目')).toBe('New project');
  });
  it('switches languages in the current session without a reload', () => {
    render(<LanguageSwitcher />);
    fireEvent.change(screen.getByRole('combobox', { name: 'Language' }), { target: { value: 'zh' } });
    expect(t('New project')).toBe('新建项目');
    expect(document.documentElement.lang).toBe('zh-CN');
    expect(localStorage.getItem('lvgl-editor-lang')).toBe('zh');
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'ru' } });
    expect(t('保存')).toBe('Сохранить');
    expect(document.documentElement.lang).toBe('ru');
  });
  it('preserves placeholders, custom values and decorated labels', () => {
    expect(t('坐标点 ({0})', 3)).toBe('Points (3)');
    expect(t('📝 复制代码')).toBe('📝 Copy code');
    expect(t('my_device_配方')).toBe('my_device_配方');
    setLang('ru');
    expect(t('📋 Copy')).toBe('📋 Копировать');
  });
});
