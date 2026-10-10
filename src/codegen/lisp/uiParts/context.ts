import type { FontResource, ImageResource } from '../../../resources/types';
import type { LvglComponent } from '../../../types';
import type { NameResolver } from '../names';
import type { LispGenOptions } from '../types';

export interface UiContext {
  options: LispGenOptions;
  names: NameResolver;
  imageResources: ImageResource[];
  fontResources: FontResource[];
  defaultFont?: string;
  defaultFontSize?: number;
  /** image resource id -> palette produced by the asset converter (index 0 = transparent) */
  imagePalettes?: Record<string, Array<number | null>>;
  /** color for library icons (theme text color) */
  iconColor?: string;
}

/** Arguments shared by the per-widget property generators */
export interface PropsArgs {
  comp: LvglComponent;
  v: string;
  ctx: UiContext;
}
