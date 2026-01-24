import { create } from 'zustand';

export interface Session {
    userId: number;
    username: string;
    fullName: string;
    role: 'admin' | 'receptionist' | 'technician' | 'pathologist' | 'auditor';
}

interface AuthState {
    session: Session | null;
    isLoading: boolean;
    error: string | null;
    login: (username: string, password: string) => Promise<boolean>;
    logout: () => void;
    clearError: () => void;
}

// Mock login for now - will be replaced with IPC call
export const useAuthStore = create<AuthState>((set) => ({
    session: null,
    isLoading: false,
    error: null,

    login: async (username: string, password: string) => {
        set({ isLoading: true, error: null });

        // Simulate login - in production this calls the main process
        await new Promise(resolve => setTimeout(resolve, 500));

        if (username === 'admin' && password === 'admin123') {
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
    },

    logout: () => set({ session: null }),
    clearError: () => set({ error: null }),
}));
