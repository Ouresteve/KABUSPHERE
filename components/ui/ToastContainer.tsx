'use client';

import React from 'react';
import { useToast } from '@/lib/toast-context';
import { CheckCircle, AlertCircle, Info, AlertTriangle, X } from 'lucide-react';

export const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useToast();

  const getIcon = (type: string) => {
    switch (type) {
      case 'success':
        return <CheckCircle className="w-5 h-5 flex-shrink-0" />;
      case 'error':
        return <AlertCircle className="w-5 h-5 flex-shrink-0" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5 flex-shrink-0" />;
      case 'info':
      default:
        return <Info className="w-5 h-5 flex-shrink-0" />;
    }
  };

  const getStyles = (type: string) => {
    switch (type) {
      case 'success':
        return {
          bg: 'bg-green-50',
          border: 'border-green-200',
          text: 'text-green-900',
          icon: 'text-green-600',
        };
      case 'error':
        return {
          bg: 'bg-red-50',
          border: 'border-red-200',
          text: 'text-red-900',
          icon: 'text-red-600',
        };
      case 'warning':
        return {
          bg: 'bg-yellow-50',
          border: 'border-yellow-200',
          text: 'text-yellow-900',
          icon: 'text-yellow-600',
        };
      case 'info':
      default:
        return {
          bg: 'bg-blue-50',
          border: 'border-blue-200',
          text: 'text-blue-900',
          icon: 'text-blue-600',
        };
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-3 pointer-events-none">
      {toasts.map((toast) => {
        const styles = getStyles(toast.type);
        return (
          <div
            key={toast.id}
            className={`${styles.bg} ${styles.border} border rounded-2xl p-4 shadow-lg pointer-events-auto max-w-sm animate-in fade-in slide-in-from-right-4 duration-300`}
          >
            <div className="flex items-start gap-3">
              <div className={styles.icon}>{getIcon(toast.type)}</div>
              <div className="flex-1">
                <p className={`${styles.text} font-medium text-sm`}>{toast.message}</p>
              </div>
              <button
                onClick={() => removeToast(toast.id)}
                className={`${styles.text} hover:opacity-70 transition p-1 -mr-1`}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
};
