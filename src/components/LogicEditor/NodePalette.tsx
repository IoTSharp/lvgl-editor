// Node Palette - Drag nodes from here to the canvas

import React, { useState, useCallback } from 'react';
import { NODE_CATEGORIES, getNodesByCategory, NODE_DEFINITIONS } from './nodeDefinitions';
import type { LogicNodeDefinition } from './types';
import './NodePalette.css';

interface NodePaletteProps {
  onDragStart: (event: React.DragEvent, nodeDefinition: LogicNodeDefinition) => void;
}

const NodePalette: React.FC<NodePaletteProps> = ({ onDragStart }) => {
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({
    trigger: true,
    condition: true,
    action: true,
    data: true,
    custom: true,
  });
  const [searchQuery, setSearchQuery] = useState('');

  const toggleCategory = useCallback((categoryId: string) => {
    setExpandedCategories(prev => ({
      ...prev,
      [categoryId]: !prev[categoryId],
    }));
  }, []);

  const handleDragStart = useCallback(
    (event: React.DragEvent, definition: LogicNodeDefinition) => {
      event.dataTransfer.setData('application/json', JSON.stringify(definition));
      event.dataTransfer.effectAllowed = 'copy';
      onDragStart(event, definition);
    },
    [onDragStart]
  );

  // Filter nodes by search query
  const filteredDefinitions = searchQuery
    ? NODE_DEFINITIONS.filter(
        def =>
          def.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
          def.description.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : null;

  return (
    <div className="node-palette">
      <div className="palette-header">
        <h3>节点</h3>
      </div>

      {/* Search */}
      <div className="palette-search">
        <input
          type="text"
          placeholder="搜索节点..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
        />
        {searchQuery && (
          <button className="clear-search" onClick={() => setSearchQuery('')}>
            ✕
          </button>
        )}
      </div>

      {/* Node List */}
      <div className="palette-content">
        {searchQuery && filteredDefinitions ? (
          // Search results
          <div className="search-results">
            {filteredDefinitions.length === 0 ? (
              <div className="no-results">未找到匹配的节点</div>
            ) : (
              filteredDefinitions.map(def => (
                <NodeItem
                  key={def.subType}
                  definition={def}
                  onDragStart={handleDragStart}
                />
              ))
            )}
          </div>
        ) : (
          // Category view
          NODE_CATEGORIES.map(category => (
            <div key={category.id} className="palette-category">
              <div
                className="category-header"
                onClick={() => toggleCategory(category.id)}
                style={{ borderLeftColor: category.color }}
              >
                <span className="category-icon">{category.icon}</span>
                <span className="category-name">{category.name}</span>
                <span className="category-toggle">
                  {expandedCategories[category.id] ? '▼' : '▶'}
                </span>
              </div>
              {expandedCategories[category.id] && (
                <div className="category-nodes">
                  {getNodesByCategory(category.id).map(def => (
                    <NodeItem
                      key={def.subType}
                      definition={def}
                      onDragStart={handleDragStart}
                    />
                  ))}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

// Individual node item
interface NodeItemProps {
  definition: LogicNodeDefinition;
  onDragStart: (event: React.DragEvent, definition: LogicNodeDefinition) => void;
}

const NodeItem: React.FC<NodeItemProps> = ({ definition, onDragStart }) => {
  return (
    <div
      className="node-item"
      draggable
      onDragStart={e => onDragStart(e, definition)}
      style={{ borderLeftColor: definition.color }}
      title={definition.description}
    >
      <span className="node-icon">{definition.icon}</span>
      <div className="node-info">
        <span className="node-label">{definition.label}</span>
        <span className="node-description">{definition.description}</span>
      </div>
    </div>
  );
};

export default NodePalette;
