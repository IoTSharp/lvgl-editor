import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import NewProjectDialog from '../NewProjectDialog';
import ProjectSettings from '../../ProjectSettings/ProjectSettings';
import EventEditDialog from '../../EventPanel/EventEditDialog';
import { useAppStore } from '../../../store/appStore';
import { useProjectStore, DEFAULT_DISPLAY, DEFAULT_LVGL_CONFIG, type ProjectConfig } from '../../../store/projectStore';
import { setLang, t } from '../../../i18n';
import type { EventBinding } from '../../../types';

const initialProjectStore = useProjectStore.getState();
const initialAppStore = useAppStore.getState();
beforeEach(() => { delete window.LVGL_EDITOR_OPTIONS; setLang('en'); });
afterEach(() => {
  cleanup(); delete window.LVGL_EDITOR_OPTIONS;
  useProjectStore.setState(initialProjectStore, true);
  useAppStore.setState(initialAppStore, true);
});

describe('project output selection', () => {
  it('offers all three targets and defaults standalone creation to C', () => {
    render(<NewProjectDialog onClose={() => {}} onCreate={() => {}} />);
    const select = screen.getByLabelText('Output target') as HTMLSelectElement;
    expect(select.value).toBe('c-lvgl');
    expect([...select.options].map(option => option.value)).toEqual(['c-lvgl', 'lispbm-vesc', 'basic-iotembedded']);
  });
  it('uses HmiCraft host options for BASIC creation and passes selection to storage', () => {
    window.LVGL_EDITOR_OPTIONS = { defaultTarget: 'basic-iotembedded' };
    const onCreate = vi.fn();
    render(<NewProjectDialog onClose={() => {}} onCreate={onCreate} />);
    expect((screen.getByLabelText('Output target') as HTMLSelectElement).value).toBe('basic-iotembedded');
    fireEvent.click(screen.getByRole('button', { name: /^(Create|创建)$/ }));
    expect(onCreate.mock.calls[0][3]).toBe('basic-iotembedded');
  });
  it('filters creation choices when the host restricts targets', () => {
    window.LVGL_EDITOR_OPTIONS = { defaultTarget: 'basic-iotembedded', allowedTargets: ['basic-iotembedded'] };
    render(<NewProjectDialog onClose={() => {}} onCreate={() => {}} />);
    const select = screen.getByLabelText('Output target') as HTMLSelectElement;
    expect([...select.options].map(option => option.value)).toEqual(['basic-iotembedded']);
  });
  it('preserves the selected C profile while toggling creation targets', () => {
    const onCreate = vi.fn();
    render(<NewProjectDialog onClose={() => {}} onCreate={onCreate} />);
    fireEvent.change(screen.getByLabelText('C integration profile'), { target: { value: 'stm32cube-hal' } });
    fireEvent.change(screen.getByLabelText('Output target'), { target: { value: 'lispbm-vesc' } });
    expect(screen.queryByLabelText('C integration profile')).toBeNull();
    fireEvent.change(screen.getByLabelText('Output target'), { target: { value: 'c-lvgl' } });
    expect((screen.getByLabelText('C integration profile') as HTMLSelectElement).value).toBe('stm32cube-hal');
    fireEvent.click(screen.getByRole('button', { name: /^(Create|创建)$/ }));
    expect(onCreate.mock.calls[0][4]).toBe('stm32cube-hal');
  });
  it('saves settings and updates the active output target', async () => {
    const update = vi.fn(async (_config: ProjectConfig) => {});
    useAppStore.setState({ currentProjectId: 'p', outputTarget: 'c-lvgl' });
    useProjectStore.setState({ getProjectConfig: vi.fn(async () => ({ id: 'p', name: 'Keep name', outputTarget: 'c-lvgl' as const, createdAt: 1, updatedAt: 1, display: DEFAULT_DISPLAY, lvglConfig: DEFAULT_LVGL_CONFIG, codeGenOptions: initialProjectStore.projects[0]?.config.codeGenOptions ?? { outputFormat: 'single-file' as const, includeComments: true, useStaticAllocation: true, prefix: 'ui', indentSize: 4, indentStyle: 'spaces' as const } })), updateProjectConfig: update });
    render(<ProjectSettings />);
    const select = await screen.findByLabelText('Output target');
    fireEvent.change(select, { target: { value: 'lispbm-vesc' } });
    fireEvent.click(screen.getByRole('button', { name: /^(Save|保存)$/ }));
    await waitFor(() => expect(update).toHaveBeenCalled());
    expect(update.mock.calls[0][0]).toMatchObject({ outputTarget: 'lispbm-vesc', name: 'Keep name' });
    expect(useAppStore.getState().outputTarget).toBe('lispbm-vesc');
  });
  it('edits Lisp event code while preserving C and BASIC implementations', () => {
    useAppStore.setState({ outputTarget: 'lispbm-vesc' });
    const onSave = vi.fn();
    render(<EventEditDialog isCreating={false} onClose={() => {}} onSave={onSave} event={{ id: 'e', eventType: 'LV_EVENT_CLICKED', handlerType: 'custom', customCode: 'legacy C', customCodeByTarget: { 'c-lvgl': 'C', 'lispbm-vesc': '(print 1)', 'basic-iotembedded': 'PRINT 1' } }} />);
    fireEvent.change(screen.getByRole('textbox'), { target: { value: '(print 2)' } });
    fireEvent.click(screen.getByRole('button', { name: /^(Save|保存)$/ }));
    expect(onSave.mock.calls[0][0]).toMatchObject({ customCode: 'legacy C', customCodeByTarget: { 'c-lvgl': 'C', 'lispbm-vesc': '(print 2)', 'basic-iotembedded': 'PRINT 1' } });
  });
  it('retains three handwritten languages when saving custom to builtin and back', () => {
    useAppStore.setState({ outputTarget: 'lispbm-vesc' });
    const original: EventBinding = { id: 'mode-switch', eventType: 'LV_EVENT_CLICKED', handlerType: 'custom', customCode: 'legacy C', customCodeByTarget: { 'c-lvgl': 'C retained', 'lispbm-vesc': '(print "keep")', 'basic-iotembedded': 'PRINT "keep"' } };
    const onSave = vi.fn<(event: EventBinding) => void>();
    const first = render(<EventEditDialog isCreating={false} onClose={() => {}} onSave={onSave} event={original} />);
    fireEvent.click(screen.getByRole('button', { name: t('内置动作') }));
    fireEvent.click(screen.getByRole('button', { name: t('保存') }));
    const builtin = onSave.mock.calls[0][0];
    expect(builtin.handlerType).toBe('builtin');
    expect(builtin.customCode).toBe(original.customCode);
    expect(builtin.customCodeByTarget).toEqual(original.customCodeByTarget);
    expect(builtin.customCodeByTarget).not.toBe(original.customCodeByTarget);
    first.unmount();
    render(<EventEditDialog isCreating={false} onClose={() => {}} onSave={onSave} event={builtin} />);
    fireEvent.click(screen.getByRole('button', { name: t('自定义代码') }));
    expect((screen.getByRole('textbox') as HTMLTextAreaElement).value).toBe('(print "keep")');
    fireEvent.click(screen.getByRole('button', { name: t('保存') }));
    const restored = onSave.mock.calls[1][0];
    expect(restored.handlerType).toBe('custom');
    expect(restored.customCode).toBe(original.customCode);
    expect(restored.customCodeByTarget).toEqual(original.customCodeByTarget);
  });
});
