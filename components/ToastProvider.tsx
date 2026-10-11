'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react';
import { createPortal } from 'react-dom';

export type ToastVariant = 'success' | 'error';

interface Toast {
  id: string;
  message: string;
  variant: ToastVariant;
}

interface ToastContextValue {
  success: (message: string) => void;
  error: (message: string) => void;
  show: (message: string, variant?: ToastVariant) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const AUTO_DISMISS_MS = 3500;

const emptySubscribe = () => () => {};

/** True once hydrated on the client; false during SSR. Portal-safe. */
function useIsMounted(): boolean {
  return useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  );
}

/**
 * Dependency-free toast system: a React context exposing success/error/show,
 * plus a fixed, portal-rendered stack in the bottom-right. Toasts auto-dismiss
 * after ~3.5s, are click-dismissible, stack when multiple fire, and animate in
 * gently (disabled under prefers-reduced-motion via the CSS class). Mount this
 * once (in the root layout) so the whole app can call useToast().
 */
export default function ToastProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const mounted = useIsMounted();
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>());

  const remove = useCallback((id: string) => {
    const timer = timers.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timers.current.delete(id);
    }
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const show = useCallback(
    (message: string, variant: ToastVariant = 'success') => {
      const id =
        typeof crypto !== 'undefined' && 'randomUUID' in crypto
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      setToasts((prev) => [...prev, { id, message, variant }]);
      const timer = setTimeout(() => remove(id), AUTO_DISMISS_MS);
      timers.current.set(id, timer);
    },
    [remove],
  );

  // Clear any pending timers on unmount.
  useEffect(() => {
    const map = timers.current;
    return () => {
      map.forEach((timer) => clearTimeout(timer));
      map.clear();
    };
  }, []);

  const value = useMemo<ToastContextValue>(
    () => ({
      success: (message) => show(message, 'success'),
      error: (message) => show(message, 'error'),
      show,
    }),
    [show],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      {mounted &&
        toasts.length > 0 &&
        createPortal(
          <div className="pointer-events-none fixed bottom-4 right-4 z-50 flex flex-col gap-2">
            {toasts.map((toast) => (
              <ToastItem
                key={toast.id}
                toast={toast}
                onDismiss={() => remove(toast.id)}
              />
            ))}
          </div>,
          document.body,
        )}
    </ToastContext.Provider>
  );
}

function ToastItem({
  toast,
  onDismiss,
}: {
  toast: Toast;
  onDismiss: () => void;
}) {
  const isError = toast.variant === 'error';
  const palette = isError
    ? 'bg-pastel-blush text-pastel-blush-fg'
    : 'bg-pastel-mint text-pastel-mint-fg';

  return (
    <div
      role={isError ? 'alert' : 'status'}
      aria-live={isError ? 'assertive' : 'polite'}
      onClick={onDismiss}
      className={`toast-enter pointer-events-auto flex max-w-xs cursor-pointer items-start gap-3 rounded-xl px-4 py-3 text-sm shadow-md ${palette}`}
    >
      <span className="flex-1 leading-snug">{toast.message}</span>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onDismiss();
        }}
        aria-label="Dismiss notification"
        className="-mr-1 shrink-0 rounded-md px-1 text-base leading-none opacity-70 transition hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-current"
      >
        ✕
      </button>
    </div>
  );
}

/** Access the toast API. Throws if used outside <ToastProvider>. */
export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return ctx;
}
