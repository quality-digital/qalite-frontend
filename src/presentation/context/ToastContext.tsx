import {
  ReactNode,
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState
} from 'react';

export type ToastType = 'info' | 'success' | 'error';

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

  const showToast = useCallback((options: ToastOptions) => {
    const id = generateId();
    const toast: Toast = {
      id,
      message: options.message,
      type: options.type ?? 'info',
      duration: options.duration ?? DEFAULT_DURATION
    };

    setToasts((previous) => [toast, ...previous]);

    if (typeof window !== 'undefined') {
      const timeoutId = window.setTimeout(() => {
        dismissToast(id);
      }, toast.duration);

      timers.current.set(id, timeoutId);
    }
  }, [dismissToast]);

  const value = useMemo<ToastContextValue>(
    () => ({ showToast, dismissToast, toasts }),
    [showToast, dismissToast, toasts]
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
  const { toasts, dismissToast } = useToast();

  return (
    <div className="toast-viewport" role="region" aria-live="polite" aria-label="Notificações">
      {toasts.map((toast) => (
        <div key={toast.id} className={`toast toast-${toast.type}`}>
          <span className="toast-message">{toast.message}</span>
          <button
            type="button"
            className="toast-dismiss"
            onClick={() => dismissToast(toast.id)}
            aria-label="Fechar notificação"
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
};
