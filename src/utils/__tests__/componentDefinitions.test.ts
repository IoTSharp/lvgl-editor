import { describe, it, expect } from 'vitest';
import {
  componentDefinitions,
  componentCategories,
  getComponentDefinition,
  getComponentsByCategory,
} from '../componentDefinitions';

describe('componentDefinitions', () => {
  // --- getComponentDefinition ---
  describe('getComponentDefinition', () => {
    it('should return definition for btn type', () => {
      const def = getComponentDefinition('btn');
      expect(def).toBeDefined();
      expect(def!.type).toBe('btn');
      expect(def!.name).toBe('Button');
      expect(def!.isContainer).toBe(true);
    });

    it('should return definition for label type', () => {
      const def = getComponentDefinition('label');
      expect(def).toBeDefined();
      expect(def!.type).toBe('label');
      expect(def!.name).toBe('Label');
      expect(def!.isContainer).toBe(false);
    });

    it('should return undefined for unknown type', () => {
      const def = getComponentDefinition('nonexistent');
      expect(def).toBeUndefined();
    });

    it('should return definition with default styles', () => {
      const def = getComponentDefinition('slider');
      expect(def).toBeDefined();
      expect(def!.defaultStyles).toBeDefined();
      expect(def!.defaultStyles.default).toBeDefined();
      expect(def!.defaultStyles.default.bgColor).toBeDefined();
    });

    it('should return definition with default props', () => {
      const def = getComponentDefinition('slider');
      expect(def).toBeDefined();
      expect(def!.defaultProps).toHaveProperty('min');
      expect(def!.defaultProps).toHaveProperty('max');
      expect(def!.defaultProps).toHaveProperty('value');
    });

    it('should return definition with correct dimensions', () => {
      const def = getComponentDefinition('btn');
      expect(def).toBeDefined();
      expect(def!.defaultWidth).toBe(100);
      expect(def!.defaultHeight).toBe(40);
    });
  });

  // --- getComponentsByCategory ---
  describe('getComponentsByCategory', () => {
    it('should return basic components', () => {
      const basics = getComponentsByCategory('basic');
      expect(basics.length).toBeGreaterThan(0);
      expect(basics.every(c => c.category === 'basic')).toBe(true);
    });

    it('should return input components', () => {
      const inputs = getComponentsByCategory('input');
      expect(inputs.length).toBeGreaterThan(0);
      expect(inputs.every(c => c.category === 'input')).toBe(true);
    });

    it('should return container components', () => {
      const containers = getComponentsByCategory('container');
      expect(containers.length).toBeGreaterThan(0);
      expect(containers.every(c => c.category === 'container')).toBe(true);
      // All container components should have isContainer = true
      expect(containers.every(c => c.isContainer)).toBe(true);
    });

    it('should return display components', () => {
      const displays = getComponentsByCategory('display');
      expect(displays.length).toBeGreaterThan(0);
      expect(displays.every(c => c.category === 'display')).toBe(true);
    });

    it('should return empty array for unknown category', () => {
      const unknown = getComponentsByCategory('nonexistent');
      expect(unknown).toHaveLength(0);
    });
  });

  // --- all component types ---
  describe('all component types coverage', () => {
    const expectedTypes = [
      'btn', 'label', 'img', 'line',
      'textarea', 'dropdown', 'checkbox', 'switch', 'slider',
      'obj', 'tabview', 'tileview', 'win',
      'bar', 'arc', 'spinner', 'chart', 'table', 'calendar',
    ];

    it('should have at least 16 component definitions', () => {
      expect(componentDefinitions.length).toBeGreaterThanOrEqual(16);
    });

    it('should have all expected component types defined', () => {
      for (const type of expectedTypes) {
        const def = getComponentDefinition(type);
        expect(def, `Missing definition for type: ${type}`).toBeDefined();
      }
    });

    it('every definition should have required fields', () => {
      for (const def of componentDefinitions) {
        expect(def.type).toBeTruthy();
        expect(def.name).toBeTruthy();
        expect(def.icon).toBeTruthy();
        expect(def.category).toBeTruthy();
        expect(def.defaultWidth).toBeGreaterThan(0);
        expect(def.defaultHeight).toBeGreaterThan(0);
        expect(def.defaultStyles).toBeDefined();
        expect(def.defaultStyles.default).toBeDefined();
        expect(typeof def.isContainer).toBe('boolean');
      }
    });

    it('every definition should belong to a valid category', () => {
      const validCategoryIds = componentCategories.map(c => c.id);
      for (const def of componentDefinitions) {
        expect(validCategoryIds).toContain(def.category);
      }
    });

    it('all categories should have at least one component', () => {
      for (const cat of componentCategories) {
        const components = getComponentsByCategory(cat.id);
        expect(components.length, `Category "${cat.name}" has no components`).toBeGreaterThan(0);
      }
    });
  });

  // --- componentCategories ---
  describe('componentCategories', () => {
    it('should have 4 categories', () => {
      expect(componentCategories).toHaveLength(4);
    });

    it('should have basic, input, container, display categories', () => {
      const ids = componentCategories.map(c => c.id);
      expect(ids).toContain('basic');
      expect(ids).toContain('input');
      expect(ids).toContain('container');
      expect(ids).toContain('display');
    });
  });
});
