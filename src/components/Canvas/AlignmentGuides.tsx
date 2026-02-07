import React from 'react';
import type { AlignmentGuide } from '../../types';

interface AlignmentGuidesProps {
  guides: AlignmentGuide[];
}

const AlignmentGuides: React.FC<AlignmentGuidesProps> = ({ guides }) => {
  if (guides.length === 0) return null;

  return (
    <svg
      className="alignment-guides"
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 1000,
      }}
    >
      {guides.map((guide, index) => (
        <line
          key={index}
          x1={guide.type === 'vertical' ? guide.position : guide.start}
          y1={guide.type === 'horizontal' ? guide.position : guide.start}
          x2={guide.type === 'vertical' ? guide.position : guide.end}
          y2={guide.type === 'horizontal' ? guide.position : guide.end}
          stroke="#FF4081"
          strokeWidth="1"
          strokeDasharray="4 2"
        />
      ))}
    </svg>
  );
};

export default AlignmentGuides;
