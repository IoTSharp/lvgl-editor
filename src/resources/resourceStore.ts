// Resource Store - Zustand store for resource management

import { create } from 'zustand';
import type {
  ImageResource,
  FontResource,
  IconResource,
  ImageFormat,
} from './types';
import {
  fileToBase64,
  getImageDimensions,
  loadImageFromBase64,
  generateImageCCode,
  DEFAULT_IMAGE_OPTIONS,
} from './converters/imageConverter';
import {
  fontFileToBase64,
  parseFontMetadata,
} from './converters/fontConverter';

// Generate unique ID
const generateId = () => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

// Generate C-safe name
const toCName = (name: string): string => {
  return name
    .replace(/[^a-zA-Z0-9_]/g, '_')
    .replace(/^[0-9]/, '_$&')
    .toLowerCase();
};

interface ResourceState {
  // Resources
  images: ImageResource[];
  fonts: FontResource[];
  icons: IconResource[];
  
  // UI State
  activeTab: 'images' | 'fonts' | 'icons';
  viewMode: 'grid' | 'list';
  searchQuery: string;
  selectedResourceId: string | null;
  
  // Actions - Images
  addImage: (file: File) => Promise<ImageResource>;
  updateImage: (id: string, updates: Partial<ImageResource>) => void;
  deleteImage: (id: string) => void;
  getImageById: (id: string) => ImageResource | undefined;
  generateImageCode: (id: string, format?: ImageFormat) => Promise<string>;
  
  // Actions - Fonts
  addFont: (file: File) => Promise<FontResource>;
  updateFont: (id: string, updates: Partial<FontResource>) => void;
  deleteFont: (id: string) => void;
  getFontById: (id: string) => FontResource | undefined;
  
  // Actions - Icons
  addIcon: (icon: Omit<IconResource, 'id'>) => IconResource;
  deleteIcon: (id: string) => void;
  
  // Actions - UI
  setActiveTab: (tab: 'images' | 'fonts' | 'icons') => void;
  setViewMode: (mode: 'grid' | 'list') => void;
  setSearchQuery: (query: string) => void;
  setSelectedResource: (id: string | null) => void;
  
  // Actions - Project
  exportResources: () => { images: ImageResource[]; fonts: FontResource[] };
  importResources: (resources: { images: ImageResource[]; fonts: FontResource[] }) => void;
  clearAllResources: () => void;
  
  // Computed
  getFilteredImages: () => ImageResource[];
  getFilteredFonts: () => FontResource[];
  getResourceUsage: (resourceId: string) => string[]; // Returns component IDs using this resource
}

export const useResourceStore = create<ResourceState>((set, get) => ({
  // Initial state
  images: [],
  fonts: [],
  icons: [],
  activeTab: 'images',
  viewMode: 'grid',
  searchQuery: '',
  selectedResourceId: null,
  
  // Image actions
  addImage: async (file: File) => {
    const base64Data = await fileToBase64(file);
    const { width, height } = await getImageDimensions(base64Data);
    
    const baseName = file.name.replace(/\.[^/.]+$/, '');
    const cArrayName = `ui_img_${toCName(baseName)}`;
    
    const newImage: ImageResource = {
      id: generateId(),
      name: baseName,
      originalName: file.name,
      width,
      height,
      format: 'ARGB8888',
      data: base64Data,
      cArrayName,
      size: file.size,
      createdAt: Date.now(),
    };
    
    set(state => ({
      images: [...state.images, newImage],
    }));
    
    return newImage;
  },
  
  updateImage: (id, updates) => {
    set(state => ({
      images: state.images.map(img =>
        img.id === id ? { ...img, ...updates } : img
      ),
    }));
  },
  
  deleteImage: (id) => {
    set(state => ({
      images: state.images.filter(img => img.id !== id),
      selectedResourceId: state.selectedResourceId === id ? null : state.selectedResourceId,
    }));
  },
  
  getImageById: (id) => {
    return get().images.find(img => img.id === id);
  },
  
  generateImageCode: async (id, format) => {
    const image = get().getImageById(id);
    if (!image) {
      throw new Error('Image not found');
    }
    
    const { imageData } = await loadImageFromBase64(image.data);
    const options = {
      ...DEFAULT_IMAGE_OPTIONS,
      format: format || image.format,
    };
    
    const result = generateImageCCode(image.cArrayName, imageData, options);
    return result.cCode;
  },
  
  // Font actions
  addFont: async (file: File) => {
    const base64Data = await fontFileToBase64(file);
    const metadata = await parseFontMetadata(base64Data);
    
    const baseName = file.name.replace(/\.[^/.]+$/, '');
    const cFontName = `ui_font_${toCName(baseName)}`;
    
    const newFont: FontResource = {
      id: generateId(),
      name: baseName,
      family: metadata.family !== 'Unknown' ? metadata.family : baseName,
      style: metadata.style,
      sizes: [16],
      charset: 'ascii',
      bpp: 4,
      data: base64Data,
      cFontName,
      size: file.size,
      createdAt: Date.now(),
    };
    
    set(state => ({
      fonts: [...state.fonts, newFont],
    }));
    
    return newFont;
  },
  
  updateFont: (id, updates) => {
    set(state => ({
      fonts: state.fonts.map(font =>
        font.id === id ? { ...font, ...updates } : font
      ),
    }));
  },
  
  deleteFont: (id) => {
    set(state => ({
      fonts: state.fonts.filter(font => font.id !== id),
      selectedResourceId: state.selectedResourceId === id ? null : state.selectedResourceId,
    }));
  },
  
  getFontById: (id) => {
    return get().fonts.find(font => font.id === id);
  },
  
  // Icon actions
  addIcon: (iconData) => {
    const newIcon: IconResource = {
      ...iconData,
      id: generateId(),
    };
    
    set(state => ({
      icons: [...state.icons, newIcon],
    }));
    
    return newIcon;
  },
  
  deleteIcon: (id) => {
    set(state => ({
      icons: state.icons.filter(icon => icon.id !== id),
    }));
  },
  
  // UI actions
  setActiveTab: (tab) => {
    set({ activeTab: tab, selectedResourceId: null });
  },
  
  setViewMode: (mode) => {
    set({ viewMode: mode });
  },
  
  setSearchQuery: (query) => {
    set({ searchQuery: query });
  },
  
  setSelectedResource: (id) => {
    set({ selectedResourceId: id });
  },
  
  // Project actions
  exportResources: () => {
    const { images, fonts } = get();
    return { images, fonts };
  },
  
  importResources: (resources) => {
    set({
      images: resources.images || [],
      fonts: resources.fonts || [],
    });
  },
  
  clearAllResources: () => {
    set({
      images: [],
      fonts: [],
      icons: [],
      selectedResourceId: null,
    });
  },
  
  // Computed
  getFilteredImages: () => {
    const { images, searchQuery } = get();
    if (!searchQuery) return images;
    
    const query = searchQuery.toLowerCase();
    return images.filter(img =>
      img.name.toLowerCase().includes(query) ||
      img.originalName.toLowerCase().includes(query)
    );
  },
  
  getFilteredFonts: () => {
    const { fonts, searchQuery } = get();
    if (!searchQuery) return fonts;
    
    const query = searchQuery.toLowerCase();
    return fonts.filter(font =>
      font.name.toLowerCase().includes(query) ||
      font.family.toLowerCase().includes(query)
    );
  },
  
  getResourceUsage: (_resourceId: string) => {
    // This would integrate with the editor store to find components using this resource
    // For now, return empty array - will be connected later
    return [];
  },
}));

export default useResourceStore;
