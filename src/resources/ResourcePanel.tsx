// Resource Panel - Main resource management component

import React from 'react';
import { useResourceStore } from './resourceStore';
import ImageManager from './ImageManager';
import FontManager from './FontManager';
import IconLibrary from './IconLibrary';
import './ResourcePanel.css';

const ResourcePanel: React.FC = () => {
  const {
    activeTab,
    setActiveTab,
    viewMode,
    setViewMode,
    searchQuery,
    setSearchQuery,
    images,
    fonts,
  } = useResourceStore();
  
  const tabs = [
    { id: 'images' as const, label: '图片', icon: '🖼️', count: images.length },
    { id: 'fonts' as const, label: '字体', icon: '🔤', count: fonts.length },
    { id: 'icons' as const, label: '图标', icon: '⭐', count: 0 },
  ];
  
  return (
    <div className="resource-panel">
      {/* Header */}
      <div className="resource-header">
        <h3>📦 资源管理</h3>
        <div className="view-toggle">
          <button
            className={viewMode === 'grid' ? 'active' : ''}
            onClick={() => setViewMode('grid')}
            title="网格视图"
          >
            ▦
          </button>
          <button
            className={viewMode === 'list' ? 'active' : ''}
            onClick={() => setViewMode('list')}
            title="列表视图"
          >
            ☰
          </button>
        </div>
      </div>
      
      {/* Tabs */}
      <div className="resource-tabs">
        {tabs.map(tab => (
          <button
            key={tab.id}
            className={`tab-btn ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            <span className="tab-icon">{tab.icon}</span>
            <span className="tab-label">{tab.label}</span>
            {tab.count > 0 && (
              <span className="tab-count">{tab.count}</span>
            )}
          </button>
        ))}
      </div>
      
      {/* Search */}
      <div className="resource-search">
        <input
          type="text"
          placeholder="搜索资源..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        {searchQuery && (
          <button 
            className="clear-search"
            onClick={() => setSearchQuery('')}
          >
            ×
          </button>
        )}
      </div>
      
      {/* Content */}
      <div className="resource-content">
        {activeTab === 'images' && <ImageManager viewMode={viewMode} />}
        {activeTab === 'fonts' && <FontManager viewMode={viewMode} />}
        {activeTab === 'icons' && <IconLibrary viewMode={viewMode} />}
      </div>
    </div>
  );
};

export default ResourcePanel;
