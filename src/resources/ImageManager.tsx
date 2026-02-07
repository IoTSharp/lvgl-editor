// Image Manager Component

import React, { useState, useRef } from 'react';
import { useResourceStore } from './resourceStore';
import type { ImageResource, ImageFormat } from './types';
import { toast } from '../components/Toast';
import { modal } from '../components/Modal';
import './ImageManager.css';

interface ImageManagerProps {
  viewMode: 'grid' | 'list';
}

const ImageManager: React.FC<ImageManagerProps> = ({ viewMode }) => {
  const {
    getFilteredImages,
    addImage,
    deleteImage,
    updateImage,
    generateImageCode,
    selectedResourceId,
    setSelectedResource,
  } = useResourceStore();
  
  const images = getFilteredImages();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [showCodeModal, setShowCodeModal] = useState(false);
  const [generatedCode, setGeneratedCode] = useState('');
  const [codeFormat, setCodeFormat] = useState<ImageFormat>('ARGB8888');
  
  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };
  
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    setIsUploading(true);
    
    try {
      for (const file of Array.from(files)) {
        if (!file.type.startsWith('image/')) {
          console.warn(`Skipping non-image file: ${file.name}`);
          continue;
        }
        await addImage(file);
      }
    } catch (error) {
      console.error('Failed to upload image:', error);
      toast.error('上传图片失败');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };
  
  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (await modal.confirm('确定要删除这个图片吗？')) {
      deleteImage(id);
    }
  };
  
  const handleGenerateCode = async (image: ImageResource) => {
    try {
      const code = await generateImageCode(image.id, codeFormat);
      setGeneratedCode(code);
      setShowCodeModal(true);
    } catch (error) {
      console.error('Failed to generate code:', error);
      toast.error('生成代码失败');
    }
  };
  
  const handleCopyCode = () => {
    navigator.clipboard.writeText(generatedCode);
    toast.success('代码已复制到剪贴板');
  };
  
  const handleDownloadCode = () => {
    const selectedImage = images.find(img => img.id === selectedResourceId);
    const filename = selectedImage ? `${selectedImage.cArrayName}.c` : 'image.c';
    
    const blob = new Blob([generatedCode], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };
  
  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };
  
  const selectedImage = images.find(img => img.id === selectedResourceId);
  
  return (
    <div className="image-manager">
      {/* Toolbar */}
      <div className="resource-toolbar">
        <button 
          className="upload-btn"
          onClick={handleUploadClick}
          disabled={isUploading}
        >
          {isUploading ? '上传中...' : '📤 上传图片'}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/bmp,image/gif"
          multiple
          onChange={handleFileChange}
          style={{ display: 'none' }}
        />
      </div>
      
      {/* Image List/Grid */}
      <div className={`image-list ${viewMode}`}>
        {images.length === 0 ? (
          <div className="empty-state">
            <span className="empty-icon">🖼️</span>
            <p>暂无图片资源</p>
            <p className="empty-hint">点击上方按钮上传图片</p>
          </div>
        ) : (
          images.map(image => (
            <div
              key={image.id}
              className={`image-item ${selectedResourceId === image.id ? 'selected' : ''}`}
              onClick={() => setSelectedResource(image.id)}
            >
              <div className="image-preview">
                <img src={image.data} alt={image.name} />
              </div>
              <div className="image-info">
                <span className="image-name" title={image.name}>{image.name}</span>
                <span className="image-size">{image.width}×{image.height}</span>
              </div>
              <button
                className="delete-btn"
                onClick={(e) => handleDelete(image.id, e)}
                title="删除"
              >
                🗑️
              </button>
            </div>
          ))
        )}
      </div>
      
      {/* Selected Image Details */}
      {selectedImage && (
        <div className="image-details">
          <h4>图片属性</h4>
          <div className="detail-row">
            <label>名称:</label>
            <input
              type="text"
              value={selectedImage.name}
              onChange={(e) => updateImage(selectedImage.id, { name: e.target.value })}
            />
          </div>
          <div className="detail-row">
            <label>C 变量名:</label>
            <input
              type="text"
              value={selectedImage.cArrayName}
              onChange={(e) => updateImage(selectedImage.id, { cArrayName: e.target.value })}
            />
          </div>
          <div className="detail-row">
            <label>尺寸:</label>
            <span>{selectedImage.width} × {selectedImage.height}</span>
          </div>
          <div className="detail-row">
            <label>文件大小:</label>
            <span>{formatFileSize(selectedImage.size)}</span>
          </div>
          <div className="detail-row">
            <label>颜色格式:</label>
            <select
              value={selectedImage.format}
              onChange={(e) => updateImage(selectedImage.id, { format: e.target.value as ImageFormat })}
            >
              <option value="RGB565">RGB565 (16-bit)</option>
              <option value="RGB888">RGB888 (24-bit)</option>
              <option value="ARGB8888">ARGB8888 (32-bit)</option>
            </select>
          </div>
          
          <div className="detail-actions">
            <button onClick={() => handleGenerateCode(selectedImage)}>
              📝 生成 C 代码
            </button>
          </div>
        </div>
      )}
      
      {/* Code Modal */}
      {showCodeModal && (
        <div className="modal-overlay" onClick={() => setShowCodeModal(false)}>
          <div className="modal-content code-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>生成的 C 代码</h3>
              <button className="close-btn" onClick={() => setShowCodeModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="code-options">
                <label>颜色格式:</label>
                <select
                  value={codeFormat}
                  onChange={(e) => setCodeFormat(e.target.value as ImageFormat)}
                >
                  <option value="RGB565">RGB565</option>
                  <option value="RGB888">RGB888</option>
                  <option value="ARGB8888">ARGB8888</option>
                </select>
                <button onClick={() => selectedImage && handleGenerateCode(selectedImage)}>
                  重新生成
                </button>
              </div>
              <pre className="code-preview">{generatedCode}</pre>
            </div>
            <div className="modal-footer">
              <button onClick={handleCopyCode}>📋 复制代码</button>
              <button onClick={handleDownloadCode}>💾 下载文件</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ImageManager;
