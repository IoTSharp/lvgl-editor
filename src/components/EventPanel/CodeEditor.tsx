import React from 'react';
import './CodeEditor.css';

interface CodeEditorProps {
  value: string;
  onChange: (value: string) => void;
  language?: string;
  placeholder?: string;
  readOnly?: boolean;
}

const CodeEditor: React.FC<CodeEditorProps> = ({
  value,
  onChange,
  language = 'c',
  placeholder = '// 输入代码...',
  readOnly = false,
}) => {
  return (
    <div className="code-editor-wrapper">
      <div className="code-editor-header">
        <span className="language-badge">{language.toUpperCase()}</span>
      </div>
      <textarea
        className="code-editor-textarea"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        readOnly={readOnly}
        spellCheck={false}
      />
      <div className="code-editor-footer">
        <span className="line-count">
          {value.split('\n').length} 行
        </span>
      </div>
    </div>
  );
};

export default CodeEditor;
