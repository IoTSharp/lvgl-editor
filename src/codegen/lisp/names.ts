// Name resolution shared by ui / events / logic generators.
// One place decides the Lisp variable of every component and screen so the three files always agree.

import type { Page, LvglComponent, EventBinding } from '../../types';
import type { LispGenOptions } from './types';
import { sym } from './sexp';

interface Entry {
  comp: LvglComponent;
  page: string;
  varName: string;
}

export class NameResolver {
  private byId = new Map<string, Entry>();
  private byName = new Map<string, Entry[]>();
  private screens = new Map<string, string>();
  private used = new Set<string>();
  private handlers = new Map<string, string>();
  readonly entries: Entry[] = [];

  private options: LispGenOptions;

  constructor(pages: Page[], options: LispGenOptions) {
    this.options = options;
    for (const page of pages) {
      this.screens.set(page.name, this.unique(sym(options, 'ui', 'screen', page.name)));
    }
    const firstSeen = new Map<string, string>(); // component name -> page of first occurrence
    const walk = (components: LvglComponent[], page: Page) => {
      for (const comp of components) {
        let base = sym(options, 'ui', comp.name);
        const seenOn = firstSeen.get(comp.name);
        if (seenOn === undefined) firstSeen.set(comp.name, page.name);
        else if (seenOn !== page.name) base = sym(options, 'ui', page.name, comp.name);
        const entry: Entry = { comp, page: page.name, varName: this.unique(base) };
        this.byId.set(comp.id, entry);
        const list = this.byName.get(comp.name) || [];
        list.push(entry);
        this.byName.set(comp.name, list);
        this.entries.push(entry);
        walk(comp.children, page);
      }
    };
    for (const page of pages) walk(page.components, page);
  }

  private unique(base: string): string {
    let name = base;
    let n = 2;
    const sep = this.options.namingStyle === 'snake_case' ? '_' : '-';
    while (this.used.has(name)) name = `${base}${sep}${n++}`;
    this.used.add(name);
    return name;
  }

  /** Variable of a component instance. */
  varOf(comp: LvglComponent): string {
    return this.byId.get(comp.id)?.varName ?? sym(this.options, 'ui', comp.name);
  }

  /** Variable of a component looked up by user-visible name (prefers the given page). */
  varByName(name: string, page?: string): string {
    const byId = this.byId.get(name);
    if (byId) return byId.varName;
    const list = this.byName.get(name);
    if (!list || list.length === 0) return sym(this.options, 'ui', name);
    return (list.find(e => e.page === page) ?? list[0]).varName;
  }

  compByName(name: string, page?: string): LvglComponent | undefined {
    const byId = this.byId.get(name);
    if (byId) return byId.comp;
    const list = this.byName.get(name);
    if (!list || list.length === 0) return undefined;
    return (list.find(e => e.page === page) ?? list[0]).comp;
  }

  /** Unique name of the Lisp handler function for one event binding. */
  eventHandler(comp: LvglComponent, ev: EventBinding): string {
    const key = `${comp.id}:${ev.id}`;
    let name = this.handlers.get(key);
    if (!name) {
      name = this.unique(sym(this.options, 'ui', 'event', comp.name, ev.eventType.replace('LV_EVENT_', '')));
      this.handlers.set(key, name);
    }
    return name;
  }

  screenVar(pageName: string): string {
    return this.screens.get(pageName) ?? sym(this.options, 'ui', 'screen', pageName);
  }

  hasScreen(pageName: string): boolean {
    return this.screens.has(pageName);
  }

  loadFn(pageName: string): string {
    return sym(this.options, 'ui', 'load', 'screen', pageName);
  }

  initFn(pageName: string): string {
    return sym(this.options, 'ui', 'init', 'screen', pageName);
  }
}
