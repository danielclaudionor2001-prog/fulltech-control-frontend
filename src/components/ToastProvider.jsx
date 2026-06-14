import React, { useCallback, useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, CircleAlert, X } from 'lucide-react';
import { ToastContext } from './ToastContext';

const TOAST_DURATION_MS = 4200;

const TOAST_TYPES = {
  error: {
    Icon: CircleAlert,
    title: 'Erro',
  },
  success: {
    Icon: CheckCircle2,
    title: 'Sucesso',
  },
  warning: {
    Icon: AlertTriangle,
    title: 'Atenção',
  },
};

let toastSequence = 0;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const dismissToast = useCallback((id) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const pushToast = useCallback(
    (type, description, options = {}) => {
      if (!description) {
        return;
      }

      const id = `toast-${Date.now()}-${toastSequence++}`;
      const nextToast = {
        description,
        id,
        title: options.title || TOAST_TYPES[type]?.title || 'Aviso',
        type,
      };

      setToasts((current) => [...current, nextToast]);

      window.setTimeout(() => {
        dismissToast(id);
      }, TOAST_DURATION_MS);
    },
    [dismissToast],
  );

  const value = useMemo(
    () => ({
      dismissToast,
      showError: (description, options) => pushToast('error', description, options),
      showSuccess: (description, options) =>
        pushToast('success', description, options),
      showWarning: (description, options) =>
        pushToast('warning', description, options),
    }),
    [dismissToast, pushToast],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}

      <div aria-live="polite" className="toast-region">
        {toasts.map((toast) => {
          const { Icon } = TOAST_TYPES[toast.type] || TOAST_TYPES.warning;

          return (
            <div className={`toast toast-${toast.type}`.trim()} key={toast.id} role="status">
              <div className="toast-icon">
                <Icon size={18} />
              </div>

              <div className="toast-copy">
                <strong>{toast.title}</strong>
                <p>{toast.description}</p>
              </div>

              <button
                aria-label="Fechar aviso"
                className="toast-close"
                onClick={() => dismissToast(toast.id)}
                type="button"
              >
                <X size={16} />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}
