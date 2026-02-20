import { create } from 'zustand';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

interface Toast {
    id: number;
    message: string;
    type: ToastType;
}

interface ToastState {
    toasts: Toast[];
    showToast: (message: string, type?: ToastType) => void;
    removeToast: (id: number) => void;
}

let nextId = 0;

export const useToastStore = create<ToastState>((set) => ({
    toasts: [],
    showToast: (message: string, type: ToastType = 'info') => {
        const id = ++nextId;
        set((state) => ({ toasts: [...state.toasts, { id, message, type }] }));
        // Auto-dismiss after 3 seconds
        setTimeout(() => {
            set((state) => ({ toasts: state.toasts.filter(t => t.id !== id) }));
        }, 3000);
    },
    removeToast: (id: number) => {
        set((state) => ({ toasts: state.toasts.filter(t => t.id !== id) }));
    },
}));
