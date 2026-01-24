// Global type declarations for the renderer process

// Electron API exposed via preload
export interface ElectronAPI {
    auth: {
        login: (username: string, password: string) => Promise<{ success: boolean; session?: any; error?: string }>;
        logout: () => Promise<{ success: boolean }>;
        getSession: () => Promise<any>;
    };
    patients: {
        list: () => Promise<any[]>;
        get: (id: number) => Promise<any>;
        search: (query: string) => Promise<any[]>;
        create: (data: any) => Promise<number>;
    };
    tests: {
        list: () => Promise<any[]>;
        get: (testId: number) => Promise<any>;
        getParameters: (testVersionId: number) => Promise<any[]>;
    };
    refRanges: {
        list: (parameterId: number) => Promise<any[]>;
        create: (data: any) => Promise<{ success: boolean; id?: number; error?: string }>;
        update: (id: number, data: any) => Promise<{ success: boolean }>;
        delete: (id: number) => Promise<{ success: boolean }>;
    };
}

declare global {
    interface Window {
        electronAPI?: ElectronAPI;
    }
}

export { };
