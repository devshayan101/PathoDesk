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
        list: () => Promise<any[]>;
        get: (testId: number) => Promise<any>;
        getParameters: (testVersionId: number) => Promise<any[]>;
        delete: (testId: number) => Promise<void>;
    };
    testWizard: {
        getDrafts: () => Promise<any[]>;
        createDraft: (data: any) => Promise<number>;
        updateDraft: (id: number, data: any) => Promise<void>;
        updateStep: (id: number, step: number) => Promise<void>;
        saveParams: (id: number, params: any[]) => Promise<void>;
        updateStep: (id: number, step: number) => Promise<void>;
        saveParams: (id: number, params: any[]) => Promise<void>;
        publish: (id: number) => Promise<void>;
        createDraftFromExisting: (testId: number) => Promise<number>;
        getDraft: (versionId: number) => Promise<any>;
    };
    refRanges: {
        list: (parameterId: number) => Promise<any[]>;
        create: (data: any) => Promise<{ success: boolean; id?: number; error?: string }>;
        update: (id: number, data: any) => Promise<{ success: boolean }>;
        delete: (id: number) => Promise<{ success: boolean }>;
    };
    orders: {
        list: () => Promise<any[]>;
        get: (orderId: number) => Promise<any>;
        create: (data: any) => Promise<{ success: boolean; orderId?: number; orderUid?: string; error?: string }>;
        getPending: () => Promise<any[]>;
    };
    samples: {
        list: (status?: string) => Promise<any[]>;
        create: (orderTestId: number) => Promise<{ success: boolean; sampleId?: number; sampleUid?: string; error?: string }>;
        receive: (sampleId: number) => Promise<{ success: boolean }>;
        reject: (sampleId: number, reason: string) => Promise<{ success: boolean }>;
        getPending: () => Promise<any[]>;
    };
    users: {
        list: () => Promise<any[]>;
        create: (data: any) => Promise<{ success: boolean; userId?: number; error?: string }>;
        update: (id: number, data: any) => Promise<{ success: boolean; error?: string }>;
        toggleActive: (id: number) => Promise<{ success: boolean; error?: string }>;
        listRoles: () => Promise<{ id: number; name: string }[]>;
    };
    results: {
        getPendingSamples: () => Promise<any[]>;
        get: (sampleId: number) => Promise<any>;
        save: (data: any) => Promise<{ success: boolean; error?: string }>;
        submit: (sampleId: number) => Promise<{ success: boolean; error?: string }>;
        verify: (sampleId: number, verifiedBy: number) => Promise<{ success: boolean; error?: string }>;
        finalize: (sampleId: number) => Promise<{ success: boolean; error?: string }>;
        getPrevious: (patientId: number, testId: number, currentSampleId: number) => Promise<any[]>;
    };
}

declare global {
    interface Window {
        electronAPI?: ElectronAPI;
    }
}

export { };
