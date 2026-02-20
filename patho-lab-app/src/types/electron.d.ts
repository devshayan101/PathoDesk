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
        update: (id: number, data: any) => Promise<{ success: boolean; error?: string }>;
        delete: (id: number) => Promise<{ success: boolean; error?: string }>;
    };
    tests: {
        list: () => Promise<any[]>;
        get: (testId: number) => Promise<any>;
        getParameters: (testVersionId: number) => Promise<any[]>;
        addParameter: (testVersionId: number, data: any) => Promise<{ success: boolean; id?: number; error?: string }>;
        updateParameter: (parameterId: number, data: any) => Promise<{ success: boolean; error?: string }>;
        deleteParameter: (parameterId: number) => Promise<{ success: boolean; error?: string }>;
        delete: (testId: number) => Promise<void>;
    };
    testWizard: {
        getDrafts: () => Promise<any[]>;
        createDraft: (data: any) => Promise<number>;
        updateDraft: (id: number, data: any) => Promise<void>;
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
    reports: {
        getData: (sampleId: number) => Promise<any>;
    };
    dashboard: {
        getStats: () => Promise<any>;
    };
    labSettings: {
        get: () => Promise<any>;
        update: (key: string, value: string) => Promise<any>;
    };
    doctors: {
        list: () => Promise<any[]>;
        listAll: () => Promise<any[]>;
        get: (id: number) => Promise<any>;
        create: (data: any) => Promise<any>;
        update: (id: number, data: any) => Promise<any>;
        toggleActive: (id: number) => Promise<any>;
        search: (query: string) => Promise<any[]>;
    };
    priceLists: {
        list: () => Promise<any[]>;
        listAll: () => Promise<any[]>;
        get: (id: number) => Promise<any>;
        getDefault: () => Promise<any>;
        create: (data: any) => Promise<any>;
        update: (id: number, data: any) => Promise<any>;
        delete: (id: number) => Promise<any>;
    };
    testPrices: {
        list: (priceListId: number) => Promise<any[]>;
        get: (testId: number, priceListId: number) => Promise<any>;
        set: (priceListId: number, testId: number, data: any) => Promise<any>;
        bulkSet: (priceListId: number, prices: any[]) => Promise<any>;
        getForTests: (testIds: number[], priceListId: number) => Promise<any>;
    };
    packages: {
        list: (priceListId?: number) => Promise<any[]>;
        get: (id: number) => Promise<any>;
        create: (data: any) => Promise<any>;
        update: (id: number, data: any) => Promise<any>;
    };
    invoices: {
        list: (options?: any) => Promise<any[]>;
        get: (id: number) => Promise<any>;
        getByOrder: (orderId: number) => Promise<any>;
        create: (data: any) => Promise<any>;
        finalize: (id: number, userId?: number) => Promise<any>;
        cancel: (id: number, reason: string, userId: number) => Promise<any>;
        getPatientDues: (patientId: number) => Promise<any>;
        getSummary: (fromDate?: string, toDate?: string) => Promise<any>;
    };
    payments: {
        record: (data: any) => Promise<any>;
        list: (invoiceId: number) => Promise<any[]>;
        get: (id: number) => Promise<any>;
        getPatientHistory: (patientId: number) => Promise<any[]>;
        getDailyCollection: (date?: string) => Promise<any>;
        getOutstandingDues: () => Promise<any>;
    };
    commissions: {
        getDoctorCommissions: (doctorId: number, month?: number, year?: number) => Promise<any>;
        getMonthlySummary: (doctorId: number, month: number, year: number) => Promise<any>;
        getStatement: (doctorId: number, month: number, year: number) => Promise<any>;
        getDoctorsWithPending: (month: number, year: number) => Promise<any[]>;
        createSettlement: (doctorId: number, month: number, year: number, userId?: number) => Promise<any>;
        recordPayment: (settlementId: number, amount: number, paymentMode: string, paymentReference?: string, remarks?: string, userId?: number) => Promise<any>;
        getSettlement: (settlementId: number) => Promise<any>;
        listSettlements: (options?: any) => Promise<any[]>;
    };
    qc: {
        listParameters: (options?: any) => Promise<any[]>;
        getParameter: (id: number) => Promise<any>;
        createParameter: (data: any) => Promise<any>;
        updateParameter: (id: number, data: any, userId?: number) => Promise<any>;
        recordEntry: (data: any) => Promise<any>;
        reviewEntry: (entryId: number, acceptanceStatus: string, reviewedBy: number, remarks?: string) => Promise<any>;
        listEntries: (options?: any) => Promise<any[]>;
        getTodayStatus: () => Promise<any>;
        getLeveyJennings: (qcParameterId: number, count?: number) => Promise<any>;
        listRules: () => Promise<any[]>;
        checkWestgard: (qcParameterId: number) => Promise<any>;
        getTestStatus: (testId: number) => Promise<any>;
        override: (data: { testId: number; sampleId: number; reason: string; overriddenBy: number }) => Promise<any>;
    };
    audit: {
        log: (input: any) => Promise<any>;
        getLogs: (options?: any) => Promise<any>;
        getEntityHistory: (entity: string, entityId: number) => Promise<any>;
        getRecentActivity: (limit?: number) => Promise<any[]>;
        getStats: (fromDate: string, toDate: string) => Promise<any>;
    };
    license: {
        getStatus: () => Promise<any>;
        upload: (fileContent: string) => Promise<any>;
        getMachineId: () => Promise<string>;
        isModuleEnabled: (module: string) => Promise<boolean>;
        canBilling: () => Promise<boolean>;
        canFinalize: () => Promise<boolean>;
        isTrial: () => Promise<boolean>;
    };
    billing: ElectronAPI['priceLists'];
}

declare global {
    interface Window {
        electronAPI: ElectronAPI;
    }
}

export { };
