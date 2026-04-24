export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ToastOptions {
  message: string;
  type?: ToastType;
  duration?: number;
}

type ShowFn = (opts: ToastOptions) => void;
let _show: ShowFn | null = null;

export function registerToastHandler(fn: ShowFn) {
  _show = fn;
}

export const toast = {
  show: (opts: ToastOptions) => _show?.(opts),
  success: (message: string, duration?: number) => _show?.({ message, type: 'success', duration }),
  error: (message: string, duration?: number) => _show?.({ message, type: 'error', duration }),
  info: (message: string, duration?: number) => _show?.({ message, type: 'info', duration }),
  warning: (message: string, duration?: number) => _show?.({ message, type: 'warning', duration }),
};
