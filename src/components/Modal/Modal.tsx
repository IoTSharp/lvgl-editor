import React, { useEffect, useState, useRef, useCallback } from 'react';
import './Modal.css';

type ModalType = 'alert' | 'confirm' | 'prompt';

interface ModalState {
  type: ModalType;
  message: string;
  defaultValue?: string;
  resolve: (value: boolean | string | null) => void;
}

// Global state management (same pattern as Toast)
let currentModal: ModalState | null = null;
const listeners = new Set<(modal: ModalState | null) => void>();

function notify(modal: ModalState | null) {
  currentModal = modal;
  listeners.forEach(listener => listener(modal));
}

function showModal(type: 'alert', message: string): Promise<void>;
function showModal(type: 'confirm', message: string): Promise<boolean>;
function showModal(type: 'prompt', message: string, defaultValue?: string): Promise<string | null>;
function showModal(type: ModalType, message: string, defaultValue?: string): Promise<any> {
  return new Promise((resolve) => {
    notify({ type, message, defaultValue, resolve });
  });
}

export const modal = {
  alert: (message: string) => showModal('alert', message),
  confirm: (message: string) => showModal('confirm', message),
  prompt: (message: string, defaultValue?: string) => showModal('prompt', message, defaultValue),
};

const Modal: React.FC = () => {
  const [state, setState] = useState<ModalState | null>(currentModal);
  const [inputValue, setInputValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    listeners.add(setState);
    return () => { listeners.delete(setState); };
  }, []);

  // Reset input value when a new prompt modal opens
  useEffect(() => {
    if (state?.type === 'prompt') {
      setInputValue(state.defaultValue ?? '');
      // Focus input on next tick
      setTimeout(() => inputRef.current?.select(), 0);
    }
  }, [state]);

  const handleConfirm = useCallback(() => {
    if (!state) return;
    switch (state.type) {
      case 'alert':
        state.resolve(true);
        break;
      case 'confirm':
        state.resolve(true);
        break;
      case 'prompt':
        state.resolve(inputValue);
        break;
    }
    notify(null);
  }, [state, inputValue]);

  const handleCancel = useCallback(() => {
    if (!state) return;
    switch (state.type) {
      case 'alert':
        state.resolve(true);
        break;
      case 'confirm':
        state.resolve(false);
        break;
      case 'prompt':
        state.resolve(null);
        break;
    }
    notify(null);
  }, [state]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleConfirm();
    } else if (e.key === 'Escape') {
      handleCancel();
    }
  }, [handleConfirm, handleCancel]);

  if (!state) return null;

  return (
    <div className="modal-overlay modal-global-overlay" onClick={handleCancel} onKeyDown={handleKeyDown}>
      <div className="modal-dialog" onClick={e => e.stopPropagation()}>
        <div className="modal-dialog-body">
          <p className="modal-dialog-message">{state.message}</p>
          {state.type === 'prompt' && (
            <input
              ref={inputRef}
              className="modal-dialog-input"
              type="text"
              value={inputValue}
              onChange={e => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
            />
          )}
        </div>
        <div className="modal-dialog-footer">
          {state.type !== 'alert' && (
            <button className="modal-dialog-btn modal-btn-cancel" onClick={handleCancel}>
              取消
            </button>
          )}
          <button className="modal-dialog-btn modal-btn-confirm" onClick={handleConfirm} autoFocus={state.type !== 'prompt'}>
            确定
          </button>
        </div>
      </div>
    </div>
  );
};

export default Modal;
