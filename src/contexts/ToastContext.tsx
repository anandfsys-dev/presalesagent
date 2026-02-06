'use client';

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { ToastContainer, ToastData, ToastVariant } from '@/components/ui/Toast';

interface ToastContextType {
  showToast: (message: string, variant?: ToastVariant, options?: { title?: string; duration?: number }) => void;
  success: (message: string, title?: string) => void;
  error: (message: string, title?: string) => void;
  warning: (message: string, title?: string) => void;
  info: (message: string, title?: string) => void;
  dismissToast: (id: string) => void;
  dismissAll: () => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

let toastIdCounter = 0;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastData[]>([]);

  const showToast = useCallback((
    message: string,
    variant: ToastVariant = 'info',
    options?: { title?: string; duration?: number }
  ) => {
    const id = `toast-${++toastIdCounter}`;
    const newToast: ToastData = {
      id,
      message,
      variant,
      title: options?.title,
      duration: options?.duration,
    };

    setToasts((prev) => [...prev, newToast]);
    return id;
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const dismissAll = useCallback(() => {
    setToasts([]);
  }, []);

  // Convenience methods
  const success = useCallback((message: string, title?: string) => {
    showToast(message, 'success', { title, duration: 4000 });
  }, [showToast]);

  const error = useCallback((message: string, title?: string) => {
    showToast(message, 'error', { title, duration: 0 }); // No auto-dismiss
  }, [showToast]);

  const warning = useCallback((message: string, title?: string) => {
    showToast(message, 'warning', { title, duration: 0 }); // No auto-dismiss
  }, [showToast]);

  const info = useCallback((message: string, title?: string) => {
    showToast(message, 'info', { title, duration: 6000 });
  }, [showToast]);

  return (
    <ToastContext.Provider
      value={{
        showToast,
        success,
        error,
        warning,
        info,
        dismissToast,
        dismissAll,
      }}
    >
      {children}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (context === undefined) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}
