import React, { useEffect, useState } from 'react';
import './Toast.css';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  duration?: number;
}

interface ToastProps {
  messages: ToastMessage[];
  onRemove: (id: string) => void;
}

const Toast: React.FC<ToastProps> = ({ messages, onRemove }) => {
  return (
    <div className="toast-container">
      {messages.map(msg => (
        <ToastItem key={msg.id} message={msg} onRemove={onRemove} />
      ))}
    </div>
  );
};

interface ToastItemProps {
  message: ToastMessage;
  onRemove: (id: string) => void;
}

const ToastItem: React.FC<ToastItemProps> = ({ message, onRemove }) => {
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    const duration = message.duration || 3000;
    const timer = setTimeout(() => {
      setIsExiting(true);
      setTimeout(() => onRemove(message.id), 300);
    }, duration);

    return () => clearTimeout(timer);
  }, [message, onRemove]);

  const icons = {
    success: '✓',
    error: '✕',
    warning: '⚠',
    info: 'ℹ',
  };

  return (
    <div className={`toast-item toast-${message.type} ${isExiting ? 'toast-exit' : ''}`}>
      <span className="toast-icon">{icons[message.type]}</span>
      <span className="toast-message">{message.message}</span>
      <button className="toast-close" onClick={() => onRemove(message.id)}>×</button>
    </div>
  );
};

// Toast manager hook
let toastId = 0;
const listeners: Set<(messages: ToastMessage[]) => void> = new Set();
let currentMessages: ToastMessage[] = [];

// eslint-disable-next-line react-refresh/only-export-components
export function useToast() {
  const [messages, setMessages] = useState<ToastMessage[]>(currentMessages);

  useEffect(() => {
    listeners.add(setMessages);
    return () => {
      listeners.delete(setMessages);
    };
  }, []);

  const notify = (messages: ToastMessage[]) => {
    currentMessages = messages;
    listeners.forEach(listener => listener(messages));
  };

  const showToast = (type: ToastMessage['type'], message: string, duration?: number) => {
    const id = `toast-${++toastId}`;
    const newMessage: ToastMessage = { id, type, message, duration };
    notify([...currentMessages, newMessage]);
  };

  const removeToast = (id: string) => {
    notify(currentMessages.filter(m => m.id !== id));
  };

  return {
    messages,
    showToast,
    removeToast,
    success: (msg: string, duration?: number) => showToast('success', msg, duration),
    error: (msg: string, duration?: number) => showToast('error', msg, duration),
    warning: (msg: string, duration?: number) => showToast('warning', msg, duration),
    info: (msg: string, duration?: number) => showToast('info', msg, duration),
  };
}

// Global toast function for use outside React components
// eslint-disable-next-line react-refresh/only-export-components
export const toast = {
  success: (msg: string, duration?: number) => {
    const id = `toast-${++toastId}`;
    currentMessages = [...currentMessages, { id, type: 'success', message: msg, duration }];
    listeners.forEach(listener => listener(currentMessages));
  },
  error: (msg: string, duration?: number) => {
    const id = `toast-${++toastId}`;
    currentMessages = [...currentMessages, { id, type: 'error', message: msg, duration }];
    listeners.forEach(listener => listener(currentMessages));
  },
  warning: (msg: string, duration?: number) => {
    const id = `toast-${++toastId}`;
    currentMessages = [...currentMessages, { id, type: 'warning', message: msg, duration }];
    listeners.forEach(listener => listener(currentMessages));
  },
  info: (msg: string, duration?: number) => {
    const id = `toast-${++toastId}`;
    currentMessages = [...currentMessages, { id, type: 'info', message: msg, duration }];
    listeners.forEach(listener => listener(currentMessages));
  },
};

export default Toast;
