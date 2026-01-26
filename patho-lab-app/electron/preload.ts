import { ipcRenderer, contextBridge } from 'electron'
import { IPC_CHANNELS } from '../src/types'

// Type-safe API exposed to renderer
const api = {
  // Auth
  auth: {
    login: (username: string, password: string) =>
      ipcRenderer.invoke(IPC_CHANNELS.AUTH_LOGIN, username, password),
    logout: () =>
      ipcRenderer.invoke(IPC_CHANNELS.AUTH_LOGOUT),
    getSession: () =>
      ipcRenderer.invoke(IPC_CHANNELS.AUTH_GET_SESSION),
  },

  // Patients
  patients: {
    list: () =>
      ipcRenderer.invoke(IPC_CHANNELS.PATIENT_LIST),
    get: (id: number) =>
      ipcRenderer.invoke(IPC_CHANNELS.PATIENT_GET, id),
    search: (query: string) =>
      ipcRenderer.invoke(IPC_CHANNELS.PATIENT_SEARCH, query),
    create: (data: any) =>
      ipcRenderer.invoke(IPC_CHANNELS.PATIENT_CREATE, data),
  },

  // Tests
  tests: {
    list: () =>
      ipcRenderer.invoke(IPC_CHANNELS.TEST_LIST),
    get: (testId: number) =>
      ipcRenderer.invoke(IPC_CHANNELS.TEST_GET, testId),
    getParameters: (testVersionId: number) =>
      ipcRenderer.invoke(IPC_CHANNELS.PARAMETER_LIST, testVersionId),
    delete: (testId: number) =>
      ipcRenderer.invoke(IPC_CHANNELS.TEST_DELETE, testId),
  },

  // Test Wizard
  testWizard: {
    getDrafts: () =>
      ipcRenderer.invoke(IPC_CHANNELS.TEST_WIZARD_GET_DRAFTS),
    createDraft: (data: any) =>
      ipcRenderer.invoke(IPC_CHANNELS.TEST_WIZARD_CREATE_DRAFT, data),
    updateDraft: (id: number, data: any) =>
      ipcRenderer.invoke(IPC_CHANNELS.TEST_WIZARD_UPDATE_DRAFT, id, data),
    updateStep: (id: number, step: number) =>
      ipcRenderer.invoke(IPC_CHANNELS.TEST_WIZARD_UPDATE_STEP, id, step),
    saveParams: (id: number, params: any[]) =>
      ipcRenderer.invoke(IPC_CHANNELS.TEST_WIZARD_SAVE_PARAMS, id, params),
    publish: (id: number) =>
      ipcRenderer.invoke(IPC_CHANNELS.TEST_WIZARD_PUBLISH, id),
    createDraftFromExisting: (testId: number) =>
      ipcRenderer.invoke(IPC_CHANNELS.TEST_WIZARD_CREATE_DRAFT_FROM_EXISTING, testId),
    getDraft: (versionId: number) =>
      ipcRenderer.invoke(IPC_CHANNELS.TEST_WIZARD_GET_DRAFT, versionId),
  },

  // Orders
  orders: {
    list: () =>
      ipcRenderer.invoke(IPC_CHANNELS.ORDER_LIST),
    get: (orderId: number) =>
      ipcRenderer.invoke(IPC_CHANNELS.ORDER_GET, orderId),
    create: (data: any) =>
      ipcRenderer.invoke(IPC_CHANNELS.ORDER_CREATE, data),
    getPending: () =>
      ipcRenderer.invoke(IPC_CHANNELS.ORDER_PENDING),
  },

  // Samples
  samples: {
    list: (status?: string) =>
      ipcRenderer.invoke(IPC_CHANNELS.SAMPLE_LIST, status),
    create: (orderTestId: number) =>
      ipcRenderer.invoke(IPC_CHANNELS.SAMPLE_CREATE, orderTestId),
    receive: (sampleId: number) =>
      ipcRenderer.invoke(IPC_CHANNELS.SAMPLE_RECEIVE, sampleId),
    reject: (sampleId: number, reason: string) =>
      ipcRenderer.invoke(IPC_CHANNELS.SAMPLE_REJECT, sampleId, reason),
    getPending: () =>
      ipcRenderer.invoke(IPC_CHANNELS.SAMPLE_PENDING),
  },

  // Reference Ranges
  refRanges: {
    list: (parameterId: number) =>
      ipcRenderer.invoke(IPC_CHANNELS.REF_RANGE_LIST, parameterId),
    create: (data: any) =>
      ipcRenderer.invoke(IPC_CHANNELS.REF_RANGE_CREATE, data),
    update: (id: number, data: any) =>
      ipcRenderer.invoke(IPC_CHANNELS.REF_RANGE_UPDATE, id, data),
    delete: (id: number) =>
      ipcRenderer.invoke(IPC_CHANNELS.REF_RANGE_DELETE, id),
  },

  // Users (Admin)
  users: {
    list: () =>
      ipcRenderer.invoke(IPC_CHANNELS.USER_LIST),
    create: (data: any) =>
      ipcRenderer.invoke(IPC_CHANNELS.USER_CREATE, data),
    update: (id: number, data: any) =>
      ipcRenderer.invoke(IPC_CHANNELS.USER_UPDATE, id, data),
    toggleActive: (id: number) =>
      ipcRenderer.invoke(IPC_CHANNELS.USER_TOGGLE_ACTIVE, id),
    listRoles: () =>
      ipcRenderer.invoke(IPC_CHANNELS.ROLE_LIST),
  },

  // Results
  results: {
    getPendingSamples: () =>
      ipcRenderer.invoke(IPC_CHANNELS.RESULT_PENDING_SAMPLES),
    get: (sampleId: number) =>
      ipcRenderer.invoke(IPC_CHANNELS.RESULT_GET, sampleId),
    save: (data: any) =>
      ipcRenderer.invoke(IPC_CHANNELS.RESULT_SAVE, data),
    submit: (sampleId: number) =>
      ipcRenderer.invoke(IPC_CHANNELS.RESULT_SUBMIT, sampleId),
    verify: (sampleId: number, verifiedBy: number) =>
      ipcRenderer.invoke(IPC_CHANNELS.RESULT_VERIFY, sampleId, verifiedBy),
    finalize: (sampleId: number) =>
      ipcRenderer.invoke(IPC_CHANNELS.RESULT_FINALIZE, sampleId),
    getPrevious: (patientId: number, testId: number, currentSampleId: number) =>
      ipcRenderer.invoke(IPC_CHANNELS.RESULT_GET_PREVIOUS, patientId, testId, currentSampleId),
  },

  // Reports
  reports: {
    getData: (sampleId: number) =>
      ipcRenderer.invoke(IPC_CHANNELS.REPORT_GET_DATA, sampleId),
  },

  // Lab Settings
  labSettings: {
    get: () =>
      ipcRenderer.invoke(IPC_CHANNELS.LAB_SETTINGS_GET),
    update: (key: string, value: string) =>
      ipcRenderer.invoke(IPC_CHANNELS.LAB_SETTINGS_UPDATE, key, value),
  },

  // Doctors
  doctors: {
    list: () =>
      ipcRenderer.invoke(IPC_CHANNELS.DOCTOR_LIST),
    listAll: () =>
      ipcRenderer.invoke(IPC_CHANNELS.DOCTOR_LIST_ALL),
    get: (id: number) =>
      ipcRenderer.invoke(IPC_CHANNELS.DOCTOR_GET, id),
    create: (data: any) =>
      ipcRenderer.invoke(IPC_CHANNELS.DOCTOR_CREATE, data),
    update: (id: number, data: any) =>
      ipcRenderer.invoke(IPC_CHANNELS.DOCTOR_UPDATE, id, data),
    toggleActive: (id: number) =>
      ipcRenderer.invoke(IPC_CHANNELS.DOCTOR_TOGGLE_ACTIVE, id),
    search: (query: string) =>
      ipcRenderer.invoke(IPC_CHANNELS.DOCTOR_SEARCH, query),
  },
}

// Expose to window
contextBridge.exposeInMainWorld('electronAPI', api)

// Type declaration for renderer
declare global {
  interface Window {
    electronAPI: typeof api
  }
}
