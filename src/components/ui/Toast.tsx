'use client';

import React, { useEffect, useState, useCallback } from 'react';

export type ToastVariant = 'success' | 'error' | 'warning' | 'info';

export interface ToastData {
  id: string;
  message: string;
  variant: ToastVariant;
  title?: string;
  duration?: number; // 0 means no auto-dismiss
}

interface ToastProps {
  toast: ToastData;
  onDismiss: (id: string) => void;
}

function Toast({ toast, onDismiss }: ToastProps) {
  const [progress, setProgress] = useState(100);
  const [isExiting, setIsExiting] = useState(false);

  // Default duration: success auto-closes in 4s, others require manual dismiss
  const duration = toast.duration ?? (toast.variant === 'success' ? 4000 : 0);
  const shouldAutoClose = duration > 0;

  useEffect(() => {
    if (!shouldAutoClose) return;

    const startTime = Date.now();
    const endTime = startTime + duration;

    const updateProgress = () => {
      const now = Date.now();
      const remaining = Math.max(0, endTime - now);
      const percent = (remaining / duration) * 100;
      setProgress(percent);

      if (remaining > 0) {
        requestAnimationFrame(updateProgress);
      } else {
        handleDismiss();
      }
    };

    const animationFrame = requestAnimationFrame(updateProgress);

    return () => cancelAnimationFrame(animationFrame);
  }, [duration, shouldAutoClose]);

  const handleDismiss = useCallback(() => {
    setIsExiting(true);
    setTimeout(() => onDismiss(toast.id), 200);
  }, [onDismiss, toast.id]);

  const variantStyles = {
    success: {
      container: 'bg-white border-l-4 border-l-green-500',
      icon: 'text-green-500',
      progress: 'bg-green-500',
    },
    error: {
      container: 'bg-white border-l-4 border-l-red-500',
      icon: 'text-red-500',
      progress: 'bg-red-500',
    },
    warning: {
      container: 'bg-white border-l-4 border-l-yellow-500',
      icon: 'text-yellow-500',
      progress: 'bg-yellow-500',
    },
    info: {
      container: 'bg-white border-l-4 border-l-blue-500',
      icon: 'text-blue-500',
      progress: 'bg-blue-500',
    },
  };

  const icons = {
    success: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
      </svg>
    ),
    error: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
      </svg>
    ),
    warning: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
    ),
    info: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  };

  const styles = variantStyles[toast.variant];

  return (
    <div
      className={`
        ${styles.container}
        rounded-lg shadow-lg border border-gray-200 overflow-hidden
        transform transition-all duration-200 ease-out
        ${isExiting ? 'opacity-0 translate-x-4' : 'opacity-100 translate-x-0'}
      `}
      role="alert"
    >
      <div className="p-4">
        <div className="flex items-start">
          <div className={`flex-shrink-0 ${styles.icon}`}>
            {icons[toast.variant]}
          </div>
          <div className="ml-3 flex-1 pt-0.5">
            {toast.title && (
              <p className="text-sm font-semibold text-gray-900">{toast.title}</p>
            )}
            <p className={`text-sm text-gray-600 ${toast.title ? 'mt-1' : ''}`}>
              {toast.message}
            </p>
          </div>
          <div className="ml-4 flex-shrink-0">
            <button
              onClick={handleDismiss}
              className="inline-flex text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded-md p-1"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Progress bar for auto-dismiss toasts */}
      {shouldAutoClose && (
        <div className="h-1 w-full bg-gray-100">
          <div
            className={`h-full ${styles.progress} transition-none`}
            style={{ width: `${progress}%` }}
          />
        </div>
      )}
    </div>
  );
}

interface ToastContainerProps {
  toasts: ToastData[];
  onDismiss: (id: string) => void;
}

export function ToastContainer({ toasts, onDismiss }: ToastContainerProps) {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-[100] flex flex-col gap-3 max-w-md w-full pointer-events-none">
      {toasts.map((toast) => (
        <div key={toast.id} className="pointer-events-auto">
          <Toast toast={toast} onDismiss={onDismiss} />
        </div>
      ))}
    </div>
  );
}
