import { app, BrowserWindow, ipcMain } from 'electron'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { initDatabase, closeDatabase } from './database/db'
import * as authService from './services/authService'
import * as patientService from './services/patientService'
import * as testService from './services/testService'
import * as orderService from './services/orderService'
import * as sampleService from './services/sampleService'
import * as userService from './services/userService'
import * as resultService from './services/resultService'
import * as reportService from './services/reportService'
import { IPC_CHANNELS } from '../src/types'

const require = createRequire(import.meta.url)
const __dirname = path.dirname(fileURLToPath(import.meta.url))

process.env.APP_ROOT = path.join(__dirname, '..')

export const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL']
export const MAIN_DIST = path.join(process.env.APP_ROOT, 'dist-electron')
export const RENDERER_DIST = path.join(process.env.APP_ROOT, 'dist')

process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL ? path.join(process.env.APP_ROOT, 'public') : RENDERER_DIST

let win: BrowserWindow | null

function createWindow() {
  // Initialize database (synchronous with better-sqlite3)
  initDatabase()

  win = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1200,
    minHeight: 700,
    icon: path.join(process.env.VITE_PUBLIC || '', 'electron-vite.svg'),
    backgroundColor: '#0a0f1a',
    webPreferences: {
      preload: path.join(__dirname, 'preload.mjs'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  })

  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL)
    win.webContents.openDevTools()
  } else {
    win.loadFile(path.join(RENDERER_DIST, 'index.html'))
  }
}

// Register all IPC handlers
function registerIpcHandlers() {
  // Auth
  ipcMain.handle(IPC_CHANNELS.AUTH_LOGIN, async (_, username: string, password: string) => {
    return authService.login(username, password)
  })

  ipcMain.handle(IPC_CHANNELS.AUTH_LOGOUT, () => {
    authService.logout()
    return { success: true }
  })

  ipcMain.handle(IPC_CHANNELS.AUTH_GET_SESSION, () => {
    return authService.getSession()
  })

  // Patients
  ipcMain.handle(IPC_CHANNELS.PATIENT_LIST, () => {
    return patientService.listPatients()
  })

  ipcMain.handle(IPC_CHANNELS.PATIENT_GET, (_, id: number) => {
    return patientService.getPatient(id)
  })

  ipcMain.handle(IPC_CHANNELS.PATIENT_SEARCH, (_, query: string) => {
    return patientService.searchPatients(query)
  })

  ipcMain.handle(IPC_CHANNELS.PATIENT_CREATE, (_, data) => {
    return patientService.createPatient(data)
  })

  // Tests
  ipcMain.handle(IPC_CHANNELS.TEST_LIST, () => {
    return testService.listTests()
  })

  ipcMain.handle(IPC_CHANNELS.TEST_GET, (_, testId: number) => {
    return testService.getTest(testId)
  })

  ipcMain.handle(IPC_CHANNELS.PARAMETER_LIST, (_, testVersionId: number) => {
    return testService.getTestParameters(testVersionId)
  })

  ipcMain.handle(IPC_CHANNELS.TEST_DELETE, (_, testId: number) => {
    return testService.deleteTest(testId)
  })

  // Test Wizard
  ipcMain.handle(IPC_CHANNELS.TEST_WIZARD_GET_DRAFTS, () => {
    return testService.getDrafts()
  })

  ipcMain.handle(IPC_CHANNELS.TEST_WIZARD_CREATE_DRAFT, (_, data) => {
    return testService.createTestDraft(data)
  })

  ipcMain.handle(IPC_CHANNELS.TEST_WIZARD_UPDATE_DRAFT, (_, id: number, data) => {
    return testService.updateTestDraft(id, data)
  })

  ipcMain.handle(IPC_CHANNELS.TEST_WIZARD_UPDATE_STEP, (_, id: number, step: number) => {
    return testService.updateWizardStep(id, step)
  })

  ipcMain.handle(IPC_CHANNELS.TEST_WIZARD_SAVE_PARAMS, (_, id: number, params: any[]) => {
    return testService.saveTestParameters(id, params)
  })

  ipcMain.handle(IPC_CHANNELS.TEST_WIZARD_PUBLISH, (_, id: number) => {
    return testService.publishTest(id)
  })

  ipcMain.handle(IPC_CHANNELS.TEST_WIZARD_CREATE_DRAFT_FROM_EXISTING, (_, testId: number) => {
    return testService.createDraftFromExisting(testId)
  })

  // We need a way to get draft details (which is essentially getTest + getParameters)
  ipcMain.handle(IPC_CHANNELS.TEST_WIZARD_GET_DRAFT, (_, versionId: number) => {
    const version = testService.getTest(versionId) // This actually gets by test_id? No, getTest gets by test_id.
    // Wait, getTest(testId) returns the latest version.
    // We need getTestVersion(versionId).
    // Let's check testService again.
    // testService.getTest takes testId.
    // We need a new service method getTestVersion(versionId).
    // I missed adding that to testService.ts. 
    // Actually, I can use a direct query here or better, add it to service.
    // For now, let's implement the handler by calling a new service method I will add.
    return testService.getTestVersion(versionId)
  })

  // Reference Ranges
  ipcMain.handle(IPC_CHANNELS.REF_RANGE_LIST, (_, parameterId: number) => {
    return testService.listReferenceRanges(parameterId)
  })

  ipcMain.handle(IPC_CHANNELS.REF_RANGE_CREATE, (_, data) => {
    try {
      return { success: true, id: testService.createReferenceRange(data) }
    } catch (e: any) {
      return { success: false, error: e.message }
    }
  })

  ipcMain.handle(IPC_CHANNELS.REF_RANGE_UPDATE, (_, id: number, data) => {
    testService.updateReferenceRange(id, data)
    return { success: true }
  })

  ipcMain.handle(IPC_CHANNELS.REF_RANGE_DELETE, (_, id: number) => {
    testService.deleteReferenceRange(id)
    return { success: true }
  })

  // Orders
  ipcMain.handle(IPC_CHANNELS.ORDER_LIST, () => {
    return orderService.listOrders()
  })

  ipcMain.handle(IPC_CHANNELS.ORDER_GET, (_, orderId: number) => {
    return orderService.getOrder(orderId)
  })

  ipcMain.handle(IPC_CHANNELS.ORDER_CREATE, (_, data) => {
    return orderService.createOrder(data)
  })

  ipcMain.handle(IPC_CHANNELS.ORDER_PENDING, () => {
    return orderService.getPendingOrders()
  })

  // Samples
  ipcMain.handle(IPC_CHANNELS.SAMPLE_LIST, (_, status?: string) => {
    return sampleService.listSamples(status)
  })

  ipcMain.handle(IPC_CHANNELS.SAMPLE_CREATE, (_, orderTestId: number) => {
    return sampleService.createSample(orderTestId)
  })

  ipcMain.handle(IPC_CHANNELS.SAMPLE_RECEIVE, (_, sampleId: number) => {
    return sampleService.receiveSample(sampleId)
  })

  ipcMain.handle(IPC_CHANNELS.SAMPLE_REJECT, (_, sampleId: number, reason: string) => {
    return sampleService.rejectSample(sampleId, reason)
  })

  ipcMain.handle(IPC_CHANNELS.SAMPLE_PENDING, () => {
    return sampleService.getPendingSamples()
  })

  // Users (Admin)
  ipcMain.handle(IPC_CHANNELS.USER_LIST, () => {
    return userService.listUsers()
  })

  ipcMain.handle(IPC_CHANNELS.USER_CREATE, (_, data) => {
    return userService.createUser(data)
  })

  ipcMain.handle(IPC_CHANNELS.USER_UPDATE, (_, id: number, data) => {
    return userService.updateUser(id, data)
  })

  ipcMain.handle(IPC_CHANNELS.USER_TOGGLE_ACTIVE, (_, id: number) => {
    return userService.toggleUserActive(id)
  })

  ipcMain.handle(IPC_CHANNELS.ROLE_LIST, () => {
    return userService.listRoles()
  })

  // Results
  ipcMain.handle(IPC_CHANNELS.RESULT_PENDING_SAMPLES, () => {
    return resultService.listPendingSamples()
  })

  ipcMain.handle(IPC_CHANNELS.RESULT_GET, (_, sampleId: number) => {
    return resultService.getSampleResults(sampleId)
  })

  ipcMain.handle(IPC_CHANNELS.RESULT_SAVE, (_, data) => {
    return resultService.saveResultValues(data)
  })

  ipcMain.handle(IPC_CHANNELS.RESULT_SUBMIT, (_, sampleId: number) => {
    return resultService.submitResults(sampleId)
  })

  ipcMain.handle(IPC_CHANNELS.RESULT_VERIFY, (_, sampleId: number, verifiedBy: number) => {
    return resultService.verifyResults(sampleId, verifiedBy)
  })

  ipcMain.handle(IPC_CHANNELS.RESULT_FINALIZE, (_, sampleId: number) => {
    return resultService.finalizeResults(sampleId)
  })

  ipcMain.handle(IPC_CHANNELS.RESULT_GET_PREVIOUS, (_, patientId: number, testId: number, currentSampleId: number) => {
    return resultService.getPreviousResults(patientId, testId, currentSampleId)
  })

  // Reports
  ipcMain.handle(IPC_CHANNELS.REPORT_GET_DATA, (_, sampleId: number) => {
    return reportService.getReportData(sampleId)
  })

  // Lab Settings
  ipcMain.handle(IPC_CHANNELS.LAB_SETTINGS_GET, () => {
    return reportService.getLabSettings()
  })

  ipcMain.handle(IPC_CHANNELS.LAB_SETTINGS_UPDATE, (_, key: string, value: string) => {
    reportService.updateLabSetting(key, value)
    return { success: true }
  })
}

app.on('window-all-closed', () => {
  closeDatabase()
  if (process.platform !== 'darwin') {
    app.quit()
    win = null
  }
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})

app.whenReady().then(() => {
  registerIpcHandlers()
  createWindow()
})
