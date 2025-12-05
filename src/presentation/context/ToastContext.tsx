import {
  ReactNode,
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from 'react';
import { TFunction } from 'i18next';
import { useTranslation } from 'react-i18next';
export type ToastType = 'info' | 'success' | 'error' | 'alert';

export interface ToastOptions {
  message: string;
  type?: ToastType;
  duration?: number;
}

interface Toast extends ToastOptions {
  id: string;
  type: ToastType;
}

interface ToastContextValue {
  showToast: (options: ToastOptions) => void;
  dismissToast: (id: string) => void;
  toasts: Toast[];
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

const DEFAULT_DURATION = 4500;

const generateId = () => Math.random().toString(36).slice(2, 10);

export const getToastTitles = (translation: TFunction) => ({
  info: translation('info'),
  success: translation('success'),
  error: translation('error'),
  alert: translation('alert'),
});

const toastIcons: Record<ToastType, JSX.Element> = {
  info: (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path
        fill="currentColor"
        d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm0 4.75a1.25 1.25 0 1 1-1.25 1.25A1.25 1.25 0 0 1 12 6.75Zm1.25 10h-2.5a.75.75 0 0 1 0-1.5h.5v-4h-.5a.75.75 0 0 1 0-1.5h1.75a.75.75 0 0 1 .75.75v4.75h.5a.75.75 0 0 1 0 1.5Z"
      />
    </svg>
  ),
  success: (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path
        fill="currentColor"
        d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2Zm5.36 8.2-5.76 6.1a.75.75 0 0 1-1.08.02l-3.64-3.64a.75.75 0 0 1 1.06-1.06l3.09 3.09 5.22-5.53a.75.75 0 0 1 1.11 1Z"
      />
    </svg>
  ),
  error: (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path
        fill="currentColor"
        d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2Zm3.78 13.28a.75.75 0 0 1-1.06 1.06L12 13.62l-2.72 2.72a.75.75 0 0 1-1.06-1.06L10.38 12 7.66 9.28a.75.75 0 0 1 1.06-1.06L12 10.38l2.72-2.72a.75.75 0 0 1 1.06 1.06L13.62 12Z"
      />
    </svg>
  ),
  alert: (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path
        fill="currentColor"
        d="M10.6 3.7 2.33 17.3A1.75 1.75 0 0 0 3.85 20h16.3a1.75 1.75 0 0 0 1.52-2.7L13.4 3.7a1.75 1.75 0 0 0-2.8 0Zm1.4 3.3a.9.9 0 0 1 .9.9v4.5a.9.9 0 1 1-1.8 0V7.9a.9.9 0 0 1 .9-.9Zm0 9.8a1.1 1.1 0 1 1 1.1-1.1 1.1 1.1 0 0 1-1.1 1.1Z"
      />
    </svg>
  ),
};

export const ToastProvider = ({ children }: { children: ReactNode }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const timers = useRef(new Map<string, number>());

  const dismissToast = useCallback((id: string) => {
    setToasts((previous) => previous.filter((toast) => toast.id !== id));
    const timeoutId = timers.current.get(id);
    if (timeoutId) {
      if (typeof window !== 'undefined') {
        window.clearTimeout(timeoutId);
      }
      timers.current.delete(id);
    }
  }, []);

  const showToast = useCallback(
    (options: ToastOptions) => {
      const id = generateId();
      const toast: Toast = {
        id,
        message: options.message,
        type: options.type ?? 'info',
        duration: options.duration ?? DEFAULT_DURATION,
      };

      setToasts((previous) => [toast, ...previous]);

      if (typeof window !== 'undefined') {
        const timeoutId = window.setTimeout(() => {
          dismissToast(id);
        }, toast.duration);

        timers.current.set(id, timeoutId);
      }
    },
    [dismissToast],
  );

  const value = useMemo<ToastContextValue>(
    () => ({ showToast, dismissToast, toasts }),
    [showToast, dismissToast, toasts],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastViewport />
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);

  if (!context) {
    throw new Error('useToast must be used within ToastProvider');
  }

  return context;
};

const ToastViewport = () => {
  const { t: translation } = useTranslation();
  const { toasts, dismissToast } = useToast();

  const optionsStatus = getToastTitles(translation);

  return (
    <div className="toast-viewport" role="region" aria-live="polite" aria-label="Notificações">
      {toasts.map((toast) => (
        <div key={toast.id} className={`toast toast-${toast.type}`}>
          <div className="toast-icon" aria-hidden="true">
            {toastIcons[toast.type]}
          </div>
          <div className="toast-body">
            <span className="toast-title">{optionsStatus[toast.type]}</span>
            <span className="toast-message">{toast.message}</span>
          </div>
          <button
            type="button"
            className="toast-dismiss"
            onClick={() => dismissToast(toast.id)}
            aria-label="Dispensar notificação"
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
};
