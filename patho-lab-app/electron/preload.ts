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
}

// Expose to window
contextBridge.exposeInMainWorld('electronAPI', api)

// Type declaration for renderer
declare global {
  interface Window {
    electronAPI: typeof api
  }
}
