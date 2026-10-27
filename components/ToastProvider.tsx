'use client';
import { createContext, useCallback, useContext, useMemo, useState, ReactNode } from 'react';
import { Check, X, AlertTriangle, Info } from 'lucide-react';

type ToastType = 'success' | 'error' | 'info';
type ToastItem = { id: number; type: ToastType; title: string; message?: string };
type ToastApi = {
  success: (title: string, message?: string) => void;
  error: (title: string, message?: string) => void;
  info: (title: string, message?: string) => void;
};

const ToastContext = createContext<ToastApi | undefined>(undefined);

const STYLES: Record<ToastType, { box: string; title: string; text: string; icon: string }> = {
  success: { box: 'bg-green-50 border-green-200', title: 'text-green-800', text: 'text-green-700', icon: 'bg-green-500' },
  error: { box: 'bg-red-50 border-red-200', title: 'text-red-800', text: 'text-red-700', icon: 'bg-red-500' },
  info: { box: 'bg-blue-50 border-blue-200', title: 'text-blue-800', text: 'text-blue-700', icon: 'bg-blue-500' },
};

const ICONS = { success: Check, error: AlertTriangle, info: Info };

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const remove = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const push = useCallback(
    (type: ToastType, title: string, message?: string) => {
      const id = Date.now() + Math.random();
      setToasts((prev) => [...prev, { id, type, title, message }]);
      setTimeout(() => remove(id), 4500);
    },
    [remove]
  );

  const api = useMemo<ToastApi>(
    () => ({
      success: (title, message) => push('success', title, message),
      error: (title, message) => push('error', title, message),
      info: (title, message) => push('info', title, message),
    }),
    [push]
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div
        className="fixed top-4 right-4 z-[100] flex flex-col gap-3 w-[calc(100vw-2rem)] max-w-sm pointer-events-none"
        aria-live="polite"
      >
        {toasts.map((t) => {
          const s = STYLES[t.type];
          const Icon = ICONS[t.type];
          return (
            <div
              key={t.id}
              role="status"
              className={`toast-in pointer-events-auto flex items-start gap-3 rounded-xl border px-4 py-3.5 shadow-lg ${s.box}`}
            >
              <div className={`w-6 h-6 rounded-full ${s.icon} text-white flex items-center justify-center shrink-0 mt-0.5`}>
                <Icon size={14} strokeWidth={3} />
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-semibold ${s.title}`}>{t.title}</p>
                {t.message && <p className={`text-sm mt-0.5 ${s.text}`}>{t.message}</p>}
              </div>
              <button
                onClick={() => remove(t.id)}
                className={`${s.text} opacity-70 hover:opacity-100 shrink-0`}
                aria-label="Tutup notifikasi"
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

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast harus dipakai di dalam ToastProvider');
  return ctx;
}