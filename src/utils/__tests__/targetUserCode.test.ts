import { describe, expect, it } from 'vitest';
import { readTargetCode, writeTargetCode } from '../targetUserCode';

describe('handwritten code isolation', () => {
  it('treats legacy code as C only', () => {
    expect(readTargetCode('c-lvgl', undefined, 'lv_label_set_text(label, "C");')).toContain('lv_label');
    expect(readTargetCode('lispbm-vesc', undefined, 'legacy C')).toBe('');
    expect(readTargetCode('basic-iotembedded', undefined, 'legacy C')).toBe('');
  });
  it('preserves all three languages through edits and switches', () => {
    let code = writeTargetCode('lispbm-vesc', '(print "Lisp")', undefined, 'legacy C');
    code = writeTargetCode('basic-iotembedded', 'PRINT "BASIC"', code);
    code = writeTargetCode('c-lvgl', 'edited C', code);
    expect(code).toEqual({ 'c-lvgl': 'edited C', 'lispbm-vesc': '(print "Lisp")', 'basic-iotembedded': 'PRINT "BASIC"' });
  });
  it('preserves intentional empty target code without falling back to legacy', () => {
    expect(readTargetCode('c-lvgl', { 'c-lvgl': '' }, 'old C')).toBe('');
  });
});
