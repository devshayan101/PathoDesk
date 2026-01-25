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
