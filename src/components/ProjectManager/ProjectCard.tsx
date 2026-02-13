import React from 'react';
import type { ProjectListItem } from '../../store/projectStore';
import { formatFileSize } from '../../resources/projectManager';
import './ProjectCard.css';

interface ProjectCardProps {
  item: ProjectListItem;
  onOpen: (id: string) => void;
  onDelete: (id: string) => void;
}

const ProjectCard: React.FC<ProjectCardProps> = ({ item, onOpen, onDelete }) => {
  const { config, size } = item;
  const updatedStr = new Date(config.updatedAt).toLocaleString('zh-CN');

  return (
    <div className="project-card" onClick={() => onOpen(config.id)} role="button" tabIndex={0} onKeyDown={e => { if (e.key === 'Enter') onOpen(config.id); }}>
      <div className="project-card-icon">📐</div>
      <div className="project-card-info">
        <div className="project-card-name">{config.name}</div>
        <div className="project-card-meta">
          {config.display.width} × {config.display.height} · {config.display.colorDepth}bit
        </div>
        <div className="project-card-meta">
          {updatedStr} · {formatFileSize(size)}
        </div>
      </div>
      <button
        className="project-card-delete"
        title="删除项目"
        onClick={e => { e.stopPropagation(); onDelete(config.id); }}
      >
        🗑️
      </button>
    </div>
  );
};

export default ProjectCard;
