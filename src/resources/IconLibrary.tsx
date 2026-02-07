// Icon Library Component - Built-in icons for LVGL

import React, { useState, useMemo } from 'react';
import { toast } from '../components/Toast';
import './IconLibrary.css';

interface IconLibraryProps {
  viewMode: 'grid' | 'list';
}

// Built-in Material Design Icons (subset)
const BUILT_IN_ICONS = [
  // Navigation
  { name: 'arrow_back', category: 'navigation', path: 'M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z' },
  { name: 'arrow_forward', category: 'navigation', path: 'M12 4l-1.41 1.41L16.17 11H4v2h12.17l-5.58 5.59L12 20l8-8z' },
  { name: 'arrow_up', category: 'navigation', path: 'M4 12l1.41 1.41L11 7.83V20h2V7.83l5.58 5.59L20 12l-8-8z' },
  { name: 'arrow_down', category: 'navigation', path: 'M20 12l-1.41-1.41L13 16.17V4h-2v12.17l-5.58-5.59L4 12l8 8z' },
  { name: 'menu', category: 'navigation', path: 'M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z' },
  { name: 'close', category: 'navigation', path: 'M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z' },
  { name: 'check', category: 'navigation', path: 'M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z' },
  { name: 'refresh', category: 'navigation', path: 'M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z' },
  
  // Action
  { name: 'home', category: 'action', path: 'M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z' },
  { name: 'settings', category: 'action', path: 'M19.14 12.94c.04-.31.06-.63.06-.94 0-.31-.02-.63-.06-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.04.31-.06.63-.06.94s.02.63.06.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z' },
  { name: 'search', category: 'action', path: 'M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z' },
  { name: 'delete', category: 'action', path: 'M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z' },
  { name: 'add', category: 'action', path: 'M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z' },
  { name: 'edit', category: 'action', path: 'M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z' },
  { name: 'save', category: 'action', path: 'M17 3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V7l-4-4zm-5 16c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3zm3-10H5V5h10v4z' },
  
  // Device
  { name: 'battery_full', category: 'device', path: 'M15.67 4H14V2h-4v2H8.33C7.6 4 7 4.6 7 5.33v15.33C7 21.4 7.6 22 8.33 22h7.33c.74 0 1.34-.6 1.34-1.33V5.33C17 4.6 16.4 4 15.67 4z' },
  { name: 'battery_low', category: 'device', path: 'M15.67 4H14V2h-4v2H8.33C7.6 4 7 4.6 7 5.33v15.33C7 21.4 7.6 22 8.33 22h7.33c.74 0 1.34-.6 1.34-1.33V5.33C17 4.6 16.4 4 15.67 4zM9 20v-9h6v9H9z' },
  { name: 'wifi', category: 'device', path: 'M1 9l2 2c4.97-4.97 13.03-4.97 18 0l2-2C16.93 2.93 7.08 2.93 1 9zm8 8l3 3 3-3c-1.65-1.66-4.34-1.66-6 0zm-4-4l2 2c2.76-2.76 7.24-2.76 10 0l2-2C15.14 9.14 8.87 9.14 5 13z' },
  { name: 'bluetooth', category: 'device', path: 'M17.71 7.71L12 2h-1v7.59L6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 11 14.41V22h1l5.71-5.71-4.3-4.29 4.3-4.29zM13 5.83l1.88 1.88L13 9.59V5.83zm1.88 10.46L13 18.17v-3.76l1.88 1.88z' },
  { name: 'brightness', category: 'device', path: 'M20 8.69V4h-4.69L12 .69 8.69 4H4v4.69L.69 12 4 15.31V20h4.69L12 23.31 15.31 20H20v-4.69L23.31 12 20 8.69zM12 18c-3.31 0-6-2.69-6-6s2.69-6 6-6 6 2.69 6 6-2.69 6-6 6zm0-10c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4z' },
  { name: 'volume_up', category: 'device', path: 'M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z' },
  { name: 'volume_off', category: 'device', path: 'M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z' },
  
  // Content
  { name: 'play', category: 'content', path: 'M8 5v14l11-7z' },
  { name: 'pause', category: 'content', path: 'M6 19h4V5H6v14zm8-14v14h4V5h-4z' },
  { name: 'stop', category: 'content', path: 'M6 6h12v12H6z' },
  { name: 'skip_next', category: 'content', path: 'M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z' },
  { name: 'skip_prev', category: 'content', path: 'M6 6h2v12H6zm3.5 6l8.5 6V6z' },
  
  // Toggle
  { name: 'star', category: 'toggle', path: 'M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z' },
  { name: 'star_border', category: 'toggle', path: 'M22 9.24l-7.19-.62L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21 12 17.27 18.18 21l-1.63-7.03L22 9.24zM12 15.4l-3.76 2.27 1-4.28-3.32-2.88 4.38-.38L12 6.1l1.71 4.04 4.38.38-3.32 2.88 1 4.28L12 15.4z' },
  { name: 'favorite', category: 'toggle', path: 'M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z' },
  { name: 'favorite_border', category: 'toggle', path: 'M16.5 3c-1.74 0-3.41.81-4.5 2.09C10.91 3.81 9.24 3 7.5 3 4.42 3 2 5.42 2 8.5c0 3.78 3.4 6.86 8.55 11.54L12 21.35l1.45-1.32C18.6 15.36 22 12.28 22 8.5 22 5.42 19.58 3 16.5 3zm-4.4 15.55l-.1.1-.1-.1C7.14 14.24 4 11.39 4 8.5 4 6.5 5.5 5 7.5 5c1.54 0 3.04.99 3.57 2.36h1.87C13.46 5.99 14.96 5 16.5 5c2 0 3.5 1.5 3.5 3.5 0 2.89-3.14 5.74-7.9 10.05z' },
  
  // Alert
  { name: 'warning', category: 'alert', path: 'M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z' },
  { name: 'error', category: 'alert', path: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z' },
  { name: 'info', category: 'alert', path: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z' },
  { name: 'help', category: 'alert', path: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 17h-2v-2h2v2zm2.07-7.75l-.9.92C13.45 12.9 13 13.5 13 15h-2v-.5c0-1.1.45-2.1 1.17-2.83l1.24-1.26c.37-.36.59-.86.59-1.41 0-1.1-.9-2-2-2s-2 .9-2 2H8c0-2.21 1.79-4 4-4s4 1.79 4 4c0 .88-.36 1.68-.93 2.25z' },
];

const CATEGORIES = [
  { id: 'all', name: '全部' },
  { id: 'navigation', name: '导航' },
  { id: 'action', name: '操作' },
  { id: 'device', name: '设备' },
  { id: 'content', name: '内容' },
  { id: 'toggle', name: '切换' },
  { id: 'alert', name: '提示' },
];

const IconLibrary: React.FC<IconLibraryProps> = ({ viewMode }) => {
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedIcon, setSelectedIcon] = useState<string | null>(null);
  const [searchQuery, _setSearchQuery] = useState('');
  
  // Note: Search functionality can be added later by exposing setSearchQuery
  void _setSearchQuery;
  
  const filteredIcons = useMemo(() => {
    let icons = BUILT_IN_ICONS;
    
    if (selectedCategory !== 'all') {
      icons = icons.filter(icon => icon.category === selectedCategory);
    }
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      icons = icons.filter(icon => icon.name.toLowerCase().includes(query));
    }
    
    return icons;
  }, [selectedCategory, searchQuery]);
  
  const selectedIconData = BUILT_IN_ICONS.find(i => i.name === selectedIcon);
  
  const handleCopySvg = () => {
    if (!selectedIconData) return;
    
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="24" height="24">
  <path d="${selectedIconData.path}" fill="currentColor"/>
</svg>`;
    
    navigator.clipboard.writeText(svg);
    toast.success('SVG 已复制到剪贴板');
  };
  
  const handleCopyPath = () => {
    if (!selectedIconData) return;
    navigator.clipboard.writeText(selectedIconData.path);
    toast.success('路径数据已复制到剪贴板');
  };
  
  return (
    <div className="icon-library">
      {/* Category Filter */}
      <div className="icon-categories">
        {CATEGORIES.map(cat => (
          <button
            key={cat.id}
            className={`category-btn ${selectedCategory === cat.id ? 'active' : ''}`}
            onClick={() => setSelectedCategory(cat.id)}
          >
            {cat.name}
          </button>
        ))}
      </div>
      
      {/* Icon Grid */}
      <div className={`icon-grid ${viewMode}`}>
        {filteredIcons.length === 0 ? (
          <div className="empty-state">
            <span className="empty-icon">⭐</span>
            <p>没有找到图标</p>
          </div>
        ) : (
          filteredIcons.map(icon => (
            <div
              key={icon.name}
              className={`icon-item ${selectedIcon === icon.name ? 'selected' : ''}`}
              onClick={() => setSelectedIcon(icon.name)}
              title={icon.name}
            >
              <svg viewBox="0 0 24 24" width="24" height="24">
                <path d={icon.path} fill="currentColor" />
              </svg>
              {viewMode === 'list' && (
                <span className="icon-name">{icon.name}</span>
              )}
            </div>
          ))
        )}
      </div>
      
      {/* Selected Icon Details */}
      {selectedIconData && (
        <div className="icon-details">
          <div className="icon-preview-large">
            <svg viewBox="0 0 24 24" width="48" height="48">
              <path d={selectedIconData.path} fill="currentColor" />
            </svg>
          </div>
          <div className="icon-info">
            <h4>{selectedIconData.name}</h4>
            <span className="icon-category">{selectedIconData.category}</span>
          </div>
          <div className="icon-actions">
            <button onClick={handleCopySvg}>📋 复制 SVG</button>
            <button onClick={handleCopyPath}>📝 复制路径</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default IconLibrary;
