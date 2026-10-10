import { comment, sym } from '../sexp';
import type { UiContext } from './context';
import type { Animation, LvglComponent, Page } from '../../../types';

export function animForms(v: string, anims: Animation[], ctx: UiContext): string[] {
  const out: string[] = [];
  for (const a of anims) {
    if (ctx.options.generateComments) out.push(comment(`Animation: ${a.name || a.type}`));
    const prop = sym({ namingStyle: 'kebab-case' }, a.property);
    const ease = sym({ namingStyle: 'kebab-case' }, a.easing || 'linear');
    out.push(`(ui-anim-add ${v} '${prop} ${Math.round(a.startValue)} ${Math.round(a.endValue)} ${Math.round(a.duration)} ${Math.round(a.delay || 0)} '${ease} ${Math.max(1, Math.round(a.repeat || 1))})`);
  }
  return out;
}

export const ANIM_RUNTIME = `(def ui-anims nil)

(defun ui-anim-add (obj prop from to dur delay ease plays)
  (setq ui-anims (cons (list obj prop from to dur delay ease plays (systime)) ui-anims)))

(defun ui-bounce (k)
  (cond
    ((< k 0.363636) (* 7.5625 k k))
    ((< k 0.727272) (let ((u (- k 0.545454))) (+ (* 7.5625 u u) 0.75)))
    ((< k 0.909090) (let ((u (- k 0.818181))) (+ (* 7.5625 u u) 0.9375)))
    (t (let ((u (- k 0.954545))) (+ (* 7.5625 u u) 0.984375)))))

(defun ui-ease (kind k)
  (cond
    ((eq kind 'ease-in) (* k k))
    ((eq kind 'ease-out) (- 1.0 (* (- 1.0 k) (- 1.0 k))))
    ((eq kind 'ease-in-out) (if (< k 0.5) (* 2.0 k k) (- 1.0 (* 2.0 (- 1.0 k) (- 1.0 k)))))
    ((eq kind 'overshoot) (let ((u (- k 1.0))) (+ 1.0 (* 2.70158 u u u) (* 1.70158 u u))))
    ((eq kind 'bounce) (ui-bounce k))
    (t k)))

;; zoom / rotation work on any widget (not only images) and turn around the centre
(defun ui-pivot (obj)
  (progn
    (lv-obj-set-style-transform-pivot-x obj (/ (lv-obj-get-width obj) 2) LV_PART_MAIN)
    (lv-obj-set-style-transform-pivot-y obj (/ (lv-obj-get-height obj) 2) LV_PART_MAIN)))

(defun ui-anim-set (obj prop v)
  (cond
    ((eq prop 'x) (lv-obj-set-x obj v))
    ((eq prop 'y) (lv-obj-set-y obj v))
    ((eq prop 'width) (lv-obj-set-width obj v))
    ((eq prop 'height) (lv-obj-set-height obj v))
    ((eq prop 'opa) (lv-obj-set-style-opa obj v LV_PART_MAIN))
    ((eq prop 'transform-zoom) (progn (ui-pivot obj) (lv-obj-set-style-transform-scale-x obj v LV_PART_MAIN) (lv-obj-set-style-transform-scale-y obj v LV_PART_MAIN)))
    ((eq prop 'transform-angle) (progn (ui-pivot obj) (lv-obj-set-style-transform-rotation obj v LV_PART_MAIN)))
    (t nil)))

;; one animation step: returns the updated record, or nil when finished
(defun ui-anim-tick (a)
  (let ((obj (ix a 0)) (prop (ix a 1)) (from (ix a 2)) (to (ix a 3))
        (dur (ix a 4)) (delay (ix a 5)) (ease (ix a 6)) (plays (ix a 7)) (t0 (ix a 8)))
    (let ((el (- (* 1000.0 (secs-since t0)) delay)))
      (cond
        ((< el 0.0) a)
        ((>= el dur)
         (progn
           (ui-anim-set obj prop to)
           (if (> plays 1) (list obj prop from to dur 0 ease (- plays 1) (systime)) nil)))
        (t (progn
             (ui-anim-set obj prop (+ from (to-i (* (- to from) (ui-ease ease (/ el dur))))))
             a))))))

;; call this regularly from the main loop
(defun ui-anim-step ()
  (if ui-anims
      ;; a failing animation (e.g. its widget was deleted) is dropped instead of stopping all the others
      (setq ui-anims (filter (lambda (a) a)
                             (map (lambda (a) (let ((r (trap (ui-anim-tick a)))) (if (eq (car r) 'exit-error) nil r))) ui-anims)))))`;

export function hasAnimations(pages: Page[]): boolean {
  const walk = (cs: LvglComponent[]): boolean => cs.some(c => (c.animations && c.animations.length > 0) || walk(c.children));
  return pages.some(p => walk(p.components));
}
