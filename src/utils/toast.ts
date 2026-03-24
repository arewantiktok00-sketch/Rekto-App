/**
 * Toast helper — uses react-native-toast-message with custom RTL config.
 * Use toast.success/error/warning/info so all toasts look consistent and friendly.
 */
import Toast from 'react-native-toast-message';

export type ToastVariant = 'success' | 'error' | 'warning' | 'info';

export interface ToastPayload {
  id: number;
  variant: ToastVariant;
  title: string;
  description?: string;
}

type ToastListener = (toast: ToastPayload | null) => void;

const listeners = new Set<ToastListener>();
let currentToast: ToastPayload | null = null;
let idCounter = 0;

const emit = (toast: ToastPayload | null) => {
  currentToast = toast;
  listeners.forEach((listener) => listener(currentToast));
};

/** Show toast via react-native-toast-message (custom config in App.tsx) */
const show = (variant: ToastVariant, title: string, description?: string) => {
  Toast.show({
    type: variant,
    text1: title,
    text2: description ?? undefined,
  });
  emit({
    id: Date.now() + idCounter++,
    variant,
    title,
    description,
  });
};

export const toast = {
  success: (title: string, description?: string) => show('success', title, description),
  error: (title: string, description?: string) => show('error', title, description),
  warning: (title: string, description?: string) => show('warning', title, description),
  info: (title: string, description?: string) => show('info', title, description),
  dismiss: () => {
    Toast.hide();
    emit(null);
  },
  subscribe: (listener: ToastListener) => {
    listeners.add(listener);
    listener(currentToast);
    return () => listeners.delete(listener);
  },
};
