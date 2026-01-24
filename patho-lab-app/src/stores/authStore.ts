import { create } from 'zustand';
import type { Session } from '../types';

interface AuthState {
    session: Session | null;
    isLoading: boolean;
    error: string | null;
    login: (username: string, password: string) => Promise<boolean>;
    logout: () => void;
    checkSession: () => Promise<void>;
    clearError: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
    session: null,
    isLoading: false,
    error: null,

    login: async (username: string, password: string) => {
        set({ isLoading: true, error: null });

        // Trim inputs to avoid whitespace issues
        const trimmedUsername = username.trim();
        const trimmedPassword = password.trim();

        console.log('Login attempt:', { username: trimmedUsername, hasElectronAPI: !!window.electronAPI });

        try {
            // Use IPC if available, fallback to mock for dev
            if (window.electronAPI) {
                const result = await window.electronAPI.auth.login(trimmedUsername, trimmedPassword);
                if (result.success && result.session) {
                    set({ session: result.session, isLoading: false });
                    return true;
                }
                set({ error: result.error || 'Login failed', isLoading: false });
                return false;
            }

            // Mock fallback for web dev mode (no Electron)
            console.log('Using mock authentication (no Electron API)');
            await new Promise(resolve => setTimeout(resolve, 500));

            if (trimmedUsername === 'admin' && trimmedPassword === 'admin123') {
                set({
                    session: {
                        userId: 1,
                        username: 'admin',
                        fullName: 'Administrator',
                        role: 'admin',
                    },
                    isLoading: false,
                });
                return true;
            }

            set({ error: 'Invalid username or password', isLoading: false });
            return false;
        } catch (e: any) {
            console.error('Login error:', e);
            set({ error: e.message, isLoading: false });
            return false;
        }
    },

    logout: async () => {
        if (window.electronAPI) {
            await window.electronAPI.auth.logout();
        }
        set({ session: null });
    },

    checkSession: async () => {
        if (window.electronAPI) {
            const session = await window.electronAPI.auth.getSession();
            set({ session });
        }
    },

    clearError: () => set({ error: null }),
}));
