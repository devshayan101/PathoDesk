import { create } from 'zustand';
import type { LicenseStatus, LicenseModule } from '../types';

interface LicenseState {
    status: LicenseStatus | null;
    isLoading: boolean;
    error: string | null;

    // Actions
    loadStatus: () => Promise<void>;
    uploadLicense: (fileContent: string) => Promise<{ success: boolean; error?: string }>;
    isModuleEnabled: (module: LicenseModule) => Promise<boolean>;
    getMachineId: () => Promise<string>;
    canBilling: () => Promise<boolean>;
    canFinalize: () => Promise<boolean>;
    isTrial: () => Promise<boolean>;
}

export const useLicenseStore = create<LicenseState>((set, get) => ({
    status: null,
    isLoading: false,
    error: null,

    loadStatus: async () => {
        set({ isLoading: true, error: null });
        try {
            if (window.electronAPI) {
                const status = await window.electronAPI.license.getStatus();
                set({ status, isLoading: false });
            } else {
                // Mock for dev mode without Electron
                set({
                    status: {
                        state: 'VALID',
                        license: {
                            license_id: 'DEV-001',
                            lab_name: 'Development Lab',
                            issued_to: 'Developer',
                            machine_id_hash: null,
                            edition: 'ENTERPRISE',
                            binding_mode: 'NONE',
                            enabled_modules: ['BILLING', 'QC_AUDIT', 'ANALYZER', 'INVENTORY', 'DOCTOR_COMMISSION'],
                            max_users: 10,
                            issue_date: new Date().toISOString(),
                            expiry_date: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
                            grace_period_days: 14
                        },
                        daysUntilExpiry: 365,
                        graceDaysRemaining: null,
                        machineIdMatch: true,
                        machineIdMismatchType: null,
                        message: 'Development mode - all features enabled'
                    },
                    isLoading: false
                });
            }
        } catch (e: any) {
            console.error('Failed to load license status:', e);
            set({ error: e.message, isLoading: false });
        }
    },

    uploadLicense: async (fileContent: string) => {
        set({ isLoading: true, error: null });
        try {
            if (window.electronAPI) {
                const result = await window.electronAPI.license.upload(fileContent);
                if (result.success) {
                    set({ status: result.status, isLoading: false });
                    return { success: true };
                } else {
                    set({ error: result.error, isLoading: false });
                    return { success: false, error: result.error };
                }
            }
            return { success: false, error: 'Electron API not available' };
        } catch (e: any) {
            set({ error: e.message, isLoading: false });
            return { success: false, error: e.message };
        }
    },

    isModuleEnabled: async (module: LicenseModule) => {
        // Check cached status first for quick response
        const { status } = get();
        if (status) {
            // In dev mode or enterprise, all modules enabled
            if (!window.electronAPI || status.license?.edition === 'ENTERPRISE') {
                return true;
            }

            // For invalid/expired, no modules
            if (status.state === 'INVALID' || status.state === 'EXPIRED') {
                return false;
            }

            // Check enabled modules list
            return status.license?.enabled_modules.includes(module) ?? false;
        }

        // Fallback to API call
        if (window.electronAPI) {
            return window.electronAPI.license.isModuleEnabled(module);
        }
        return true; // Dev mode
    },

    getMachineId: async () => {
        if (window.electronAPI) {
            return window.electronAPI.license.getMachineId();
        }
        return 'DEV-MODE-NO-MACHINE-ID';
    },

    canBilling: async () => {
        if (window.electronAPI) {
            return window.electronAPI.license.canBilling();
        }
        return true; // Dev mode
    },

    canFinalize: async () => {
        if (window.electronAPI) {
            return window.electronAPI.license.canFinalize();
        }
        return true; // Dev mode
    },

    isTrial: async () => {
        if (window.electronAPI) {
            return window.electronAPI.license.isTrial();
        }
        return false; // Dev mode
    }
}));
