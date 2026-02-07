// Font Manager Component

import React, { useRef, useState } from 'react';
import { useResourceStore } from './resourceStore';
import type { FontResource, CharsetType } from './types';
import { toast } from '../components/Toast';
import { modal } from '../components/Modal';
import { 
  COMMON_FONT_SIZES, 
  FONT_PREVIEW_TEXT,
  FONT_PREVIEW_TEXT_CJK,
  generateFontConvCommand,
  extractCharsFromText,
} from './converters/fontConverter';
import './FontManager.css';

interface FontManagerProps {
  viewMode: 'grid' | 'list';
}

const FontManager: React.FC<FontManagerProps> = ({ viewMode }) => {
  const {
    getFilteredFonts,
    addFont,
    deleteFont,
    updateFont,
    selectedResourceId,
    setSelectedResource,
  } = useResourceStore();
  
  const fonts = getFilteredFonts();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [showCommandModal, setShowCommandModal] = useState(false);
  const [generatedCommand, setGeneratedCommand] = useState('');
  const [customCharsInput, setCustomCharsInput] = useState('');
  
  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };
  
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    setIsUploading(true);
    
    try {
      for (const file of Array.from(files)) {
        const ext = file.name.toLowerCase().split('.').pop();
        if (ext !== 'ttf' && ext !== 'otf') {
          console.warn(`Skipping non-font file: ${file.name}`);
          continue;
        }
        await addFont(file);
      }
    } catch (error) {
      console.error('Failed to upload font:', error);
      toast.error('上传字体失败');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };
  
  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (await modal.confirm('确定要删除这个字体吗？')) {
      deleteFont(id);
    }
  };
  
  const handleSizeToggle = (font: FontResource, size: number) => {
    const newSizes = font.sizes.includes(size)
      ? font.sizes.filter(s => s !== size)
      : [...font.sizes, size].sort((a, b) => a - b);
    
    if (newSizes.length > 0) {
      updateFont(font.id, { sizes: newSizes });
    }
  };
  
  const handleGenerateCommand = (font: FontResource) => {
    const command = generateFontConvCommand(
      font.name + '.ttf',
      font.cFontName,
      {
        sizes: font.sizes,
        charset: font.charset,
        customChars: font.charset === 'custom' ? customCharsInput : undefined,
        bpp: 4,
        compress: false,
      }
    );
    setGeneratedCommand(command);
    setShowCommandModal(true);
  };
  
  const handleExtractChars = () => {
    const chars = extractCharsFromText(customCharsInput);
    setCustomCharsInput(chars);
  };
  
  const handleCopyCommand = () => {
    navigator.clipboard.writeText(generatedCommand);
    toast.success('命令已复制到剪贴板');
  };
  
  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };
  
  const selectedFont = fonts.find(f => f.id === selectedResourceId);
  
  return (
    <div className="font-manager">
      {/* Toolbar */}
      <div className="resource-toolbar">
        <button 
          className="upload-btn"
          onClick={handleUploadClick}
          disabled={isUploading}
        >
          {isUploading ? '上传中...' : '📤 上传字体'}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".ttf,.otf"
          multiple
          onChange={handleFileChange}
          style={{ display: 'none' }}
        />
      </div>
      
      {/* Font List */}
      <div className={`font-list ${viewMode}`}>
        {fonts.length === 0 ? (
          <div className="empty-state">
            <span className="empty-icon">🔤</span>
            <p>暂无字体资源</p>
            <p className="empty-hint">点击上方按钮上传 TTF/OTF 字体</p>
          </div>
        ) : (
          fonts.map(font => (
            <div
              key={font.id}
              className={`font-item ${selectedResourceId === font.id ? 'selected' : ''}`}
              onClick={() => setSelectedResource(font.id)}
            >
              <div className="font-preview">
                <span 
                  className="preview-text"
                  style={{ fontFamily: font.family }}
                >
                  Aa
                </span>
              </div>
              <div className="font-info">
                <span className="font-name" title={font.name}>{font.name}</span>
                <span className="font-family">{font.family}</span>
                <span className="font-sizes">
                  {font.sizes.join(', ')}px
                </span>
              </div>
              <button
                className="delete-btn"
                onClick={(e) => handleDelete(font.id, e)}
                title="删除"
              >
                🗑️
              </button>
            </div>
          ))
        )}
      </div>
      
      {/* Selected Font Details */}
      {selectedFont && (
        <div className="font-details">
          <h4>字体属性</h4>
          
          <div className="detail-row">
            <label>名称:</label>
            <input
              type="text"
              value={selectedFont.name}
              onChange={(e) => updateFont(selectedFont.id, { name: e.target.value })}
            />
          </div>
          
          <div className="detail-row">
            <label>C 变量名:</label>
            <input
              type="text"
              value={selectedFont.cFontName}
              onChange={(e) => updateFont(selectedFont.id, { cFontName: e.target.value })}
            />
          </div>
          
          <div className="detail-row">
            <label>字体族:</label>
            <span>{selectedFont.family}</span>
          </div>
          
          <div className="detail-row">
            <label>文件大小:</label>
            <span>{formatFileSize(selectedFont.size)}</span>
          </div>
          
          <div className="detail-section">
            <label>字号选择:</label>
            <div className="size-grid">
              {COMMON_FONT_SIZES.map(size => (
                <button
                  key={size}
                  className={`size-btn ${selectedFont.sizes.includes(size) ? 'active' : ''}`}
                  onClick={() => handleSizeToggle(selectedFont, size)}
                >
                  {size}
                </button>
              ))}
            </div>
          </div>
          
          <div className="detail-section">
            <label>字符集:</label>
            <select
              value={selectedFont.charset}
              onChange={(e) => updateFont(selectedFont.id, { charset: e.target.value as CharsetType })}
            >
              <option value="ascii">ASCII (基础)</option>
              <option value="latin">Latin Extended (拉丁扩展)</option>
              <option value="cjk-basic">CJK Basic (中日韩基础)</option>
              <option value="custom">自定义</option>
            </select>
          </div>
          
          {selectedFont.charset === 'custom' && (
            <div className="detail-section">
              <label>自定义字符:</label>
              <textarea
                value={customCharsInput}
                onChange={(e) => setCustomCharsInput(e.target.value)}
                placeholder="输入需要包含的字符，或粘贴文本后点击提取"
                rows={3}
              />
              <button className="extract-btn" onClick={handleExtractChars}>
                提取唯一字符
              </button>
            </div>
          )}
          
          <div className="font-preview-section">
            <label>预览:</label>
            <div 
              className="preview-box"
              style={{ fontFamily: selectedFont.family }}
            >
              <p style={{ fontSize: Math.min(...selectedFont.sizes) || 16 }}>
                {FONT_PREVIEW_TEXT}
              </p>
              {selectedFont.charset === 'cjk-basic' && (
                <p style={{ fontSize: Math.min(...selectedFont.sizes) || 16 }}>
                  {FONT_PREVIEW_TEXT_CJK}
                </p>
              )}
            </div>
          </div>
          
          <div className="detail-actions">
            <button onClick={() => handleGenerateCommand(selectedFont)}>
              🔧 生成转换命令
            </button>
          </div>
        </div>
      )}
      
      {/* Command Modal */}
      {showCommandModal && (
        <div className="modal-overlay" onClick={() => setShowCommandModal(false)}>
          <div className="modal-content command-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>lv_font_conv 转换命令</h3>
              <button className="close-btn" onClick={() => setShowCommandModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <p className="command-hint">
                使用以下命令将字体转换为 LVGL 格式。需要先安装 lv_font_conv：
                <code>npm install -g lv_font_conv</code>
              </p>
              <pre className="command-preview">{generatedCommand}</pre>
            </div>
            <div className="modal-footer">
              <button onClick={handleCopyCommand}>📋 复制命令</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FontManager;
