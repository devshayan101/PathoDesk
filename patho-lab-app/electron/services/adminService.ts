/**
 * Admin Service - Connects this PathoDesk instance to the central Admin Hub.
 *
 * Responsibilities:
 * - Periodic heartbeat to the Admin Hub (sends stats, receives config)
 * - Override backup config with admin-specified R2/S3 credentials
 * - Auto-update license file when admin pushes a new one
 * - Respect kill-switch from the admin
 * - Schedule daily backups at admin-configured time (default 8 PM)
 */

import { app, dialog, BrowserWindow } from 'electron';
import * as fs from 'fs';
import * as path from 'path';
import { queryOne } from '../database/db';
import { getLicenseService } from './licenseService';

const ADMIN_CONFIG_FILE = 'admin_config.json';
const HEARTBEAT_INTERVAL_MS = 10 * 60 * 1000; // 10 minutes

interface AdminConfig {
  hubUrl: string;
  labId: string;
  secretKey: string;
}

interface BackupOverride {
  bucket: string | null;
  region: string | null;
  endpoint: string | null;
  accessKey: string | null;
  secretKey: string | null;
  schedule: string; // HH:mm format
}

interface HeartbeatResponse {
  isKilled: boolean;
  backupConfig: BackupOverride;
  license: any | null;
  serverTime: string;
  message?: string;
}

class AdminService {
  private config: AdminConfig | null = null;
  private configPath: string;
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private backupTimer: NodeJS.Timeout | null = null;
  private lastBackupOverride: BackupOverride | null = null;
  private isKilled = false;

  constructor() {
    this.configPath = path.join(app.getPath('userData'), ADMIN_CONFIG_FILE);
  }

  /**
   * Initialize admin service on app startup
   */
  async initialize(): Promise<void> {
    this.loadConfig();

    if (!this.config) {
      console.log('Admin Service: No admin config found. Running standalone.');
      await this.setupLocalSchedule();
      return;
    }

    console.log(`Admin Service: Connected to hub at ${this.config.hubUrl}`);

    // Still setup local schedule in case heartbeat fails or doesn't have override yet
    await this.setupLocalSchedule();

    // Do initial heartbeat
    await this.sendHeartbeat();

    // Schedule periodic heartbeats
    this.heartbeatTimer = setInterval(() => this.sendHeartbeat(), HEARTBEAT_INTERVAL_MS);
  }

  /**
   * Stop the admin service
   */
  destroy(): void {
    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
    if (this.backupTimer) clearTimeout(this.backupTimer);
  }

  /**
   * Check if this installation has been killed by admin
   */
  getIsKilled(): boolean {
    return this.isKilled;
  }

  /**
   * Get admin backup override config (returns null if none set)
   */
  getBackupOverride(): BackupOverride | null {
    return this.lastBackupOverride;
  }

  /**
   * Check if an admin hub is configured
   */
  isConfigured(): boolean {
    return this.config !== null;
  }

  /**
   * Get admin config (for UI display)
   */
  getConfig(): AdminConfig | null {
    return this.config;
  }

  /**
   * Refresh the local backup schedule from the database
   */
  async refreshLocalSchedule(): Promise<void> {
    await this.setupLocalSchedule();
  }

  /**
   * Register with an admin hub
   */
  async register(hubUrl: string, labId: string, secretKey: string): Promise<{ success: boolean; error?: string }> {
    try {
      // Test the connection
      const response = await fetch(`${hubUrl}/api/v1/heartbeat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          labId,
          secretKey,
          stats: this.collectStats(),
          softwareVersion: app.getVersion(),
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({ error: 'Connection failed' }));
        return { success: false, error: data.error || `HTTP ${response.status}` };
      }

      const data = await response.json() as HeartbeatResponse;

      if (data.isKilled) {
        return { success: false, error: 'This lab has been deactivated by admin.' };
      }

      // Save config
      this.config = { hubUrl, labId, secretKey };
      this.saveConfig();

      // Process the response
      this.processHeartbeatResponse(data);

      // Start heartbeat timer
      if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = setInterval(() => this.sendHeartbeat(), HEARTBEAT_INTERVAL_MS);

      return { success: true };
    } catch (e: any) {
      return { success: false, error: e.message };
    }
  }

  /**
   * Disconnect from admin hub
   */
  disconnect(): void {
    this.config = null;
    if (fs.existsSync(this.configPath)) {
      fs.unlinkSync(this.configPath);
    }
    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
    this.lastBackupOverride = null;
    this.isKilled = false;
  }

  /**
   * Send heartbeat to admin hub
   */
  private async sendHeartbeat(): Promise<void> {
    if (!this.config) return;

    try {
      const stats = this.collectStats();

      const response = await fetch(`${this.config.hubUrl}/api/v1/heartbeat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          labId: this.config.labId,
          secretKey: this.config.secretKey,
          stats,
          softwareVersion: app.getVersion(),
        }),
      });

      if (!response.ok) {
        console.warn('Admin Service: Heartbeat failed with status', response.status);
        return;
      }

      const data = await response.json() as HeartbeatResponse;
      this.processHeartbeatResponse(data);

    } catch (e: any) {
      console.warn('Admin Service: Heartbeat failed:', e.message);
    }
  }

  /**
   * Process the response from the admin hub heartbeat
   */
  private processHeartbeatResponse(data: HeartbeatResponse): void {
    // Handle kill switch
    if (data.isKilled) {
      this.isKilled = true;
      // Show a forceful dialog
      const allWindows = BrowserWindow.getAllWindows();
      if (allWindows.length > 0) {
        dialog.showMessageBoxSync(allWindows[0], {
          type: 'error',
          title: 'Installation Deactivated',
          message: data.message || 'This PathoDesk installation has been deactivated by the administrator. Please contact support.',
          buttons: ['OK'],
        });
      }
      return;
    }

    this.isKilled = false;

    // Update backup override
    if (data.backupConfig && data.backupConfig.bucket) {
      this.lastBackupOverride = data.backupConfig;
      // Reschedule backup with new time
      this.scheduleBackup(data.backupConfig.schedule || '20:00');
    }

    // Update license if admin pushed a new one
    if (data.license && !data.license.revoked) {
      this.updateLicenseFromAdmin(data.license);
    } else if (data.license && data.license.revoked) {
      // Admin revoked the license - delete local license
      const licensePath = path.join(app.getPath('userData'), 'license.lic');
      if (fs.existsSync(licensePath)) {
        fs.unlinkSync(licensePath);
        // Re-validate
        getLicenseService().initialize();
      }
    }
  }

  /**
   * Update the local license file from admin-pushed data
   */
  private updateLicenseFromAdmin(signedLicense: any): void {
    try {
      const licensePath = path.join(app.getPath('userData'), 'license.lic');
      const newContent = JSON.stringify(signedLicense, null, 2);

      // Check if it's different from current
      let currentContent = '';
      if (fs.existsSync(licensePath)) {
        currentContent = fs.readFileSync(licensePath, 'utf-8');
      }

      if (currentContent !== newContent) {
        fs.writeFileSync(licensePath, newContent, 'utf-8');
        console.log('Admin Service: License updated from admin hub');
        // Re-validate license
        getLicenseService().initialize();
      }
    } catch (e: any) {
      console.error('Admin Service: Failed to update license:', e.message);
    }
  }

  /**
   * Schedule daily backup at specified time
   */
  private scheduleBackup(timeStr: string): void {
    if (this.backupTimer) clearTimeout(this.backupTimer);

    const schedule = () => {
      const [hours, minutes] = timeStr.split(':').map(Number);
      const now = new Date();
      const target = new Date();
      target.setHours(hours, minutes, 0, 0);

      // If time has passed today, schedule for tomorrow
      if (target.getTime() <= now.getTime()) {
        target.setDate(target.getDate() + 1);
      }

      const delay = target.getTime() - now.getTime();
      console.log(`Admin Service: Next backup scheduled at ${target.toLocaleString()} (in ${Math.round(delay / 60000)}min)`);

      this.backupTimer = setTimeout(async () => {
        console.log('Admin Service: Triggering scheduled backup...');
        try {
          const { createCloudBackup } = await import('./backupService');
          const result = await createCloudBackup();
          console.log('Admin Service: Scheduled backup result:', result.success ? 'SUCCESS' : result.error);
        } catch (e: any) {
          console.error('Admin Service: Scheduled backup error:', e.message);
        }
        // Reschedule for next day
        schedule();
      }, delay);
    };

    schedule();
  }

  /**
   * Setup initial schedule from local database settings
   */
  private async setupLocalSchedule(): Promise<void> {
    try {
      // Fetch both rows specifically
      const timeRow = queryOne<any>('SELECT setting_value FROM lab_settings WHERE setting_key = ?', ['daily_backup_time']);
      const enableRow = queryOne<any>('SELECT setting_value FROM lab_settings WHERE setting_key = ?', ['enable_cloud_backup']);
      
      const time = timeRow?.setting_value || '20:00';
      const isEnabled = enableRow?.setting_value !== 'false'; // Default to true if not set

      if (isEnabled) {
        console.log(`Admin Service: Local backup enabled for ${time}`);
        this.scheduleBackup(time);
      } else {
        console.log('Admin Service: Local automated backup is disabled.');
        if (this.backupTimer) {
          clearTimeout(this.backupTimer);
          this.backupTimer = null;
        }
      }
    } catch (e: any) {
      console.warn('Admin Service: Failed to setup local schedule:', e.message);
      // Fallback to default
      this.scheduleBackup('20:00');
    }
  }

  /**
   * Collect current stats from the database
   */
  private collectStats(): Record<string, any> {
    try {
      const totalPatients = (queryOne<any>('SELECT COUNT(*) as count FROM patients') || {}).count || 0;
      const totalOrders = (queryOne<any>('SELECT COUNT(*) as count FROM orders') || {}).count || 0;
      const totalTests = (queryOne<any>('SELECT COUNT(*) as count FROM order_tests') || {}).count || 0;

      const today = new Date().toISOString().split('T')[0];
      const todayOrders = (queryOne<any>(
        'SELECT COUNT(*) as count FROM orders WHERE order_date >= ?', [today]
      ) || {}).count || 0;
      const todayPatients = (queryOne<any>(
        'SELECT COUNT(*) as count FROM patients WHERE created_at >= ?', [today]
      ) || {}).count || 0;

      // Revenue
      const todayRevenue = (queryOne<any>(
        'SELECT COALESCE(SUM(net_amount), 0) as total FROM orders WHERE order_date >= ?', [today]
      ) || {}).total || 0;

      // Machine ID
      const licenseStatus = getLicenseService().getStatus();

      // DB file size
      const dbPath = path.join(app.getPath('userData'), 'patholab.db');
      let dbSizeMb = 0;
      if (fs.existsSync(dbPath)) {
        dbSizeMb = fs.statSync(dbPath).size / (1024 * 1024);
      }

      return {
        totalPatients,
        totalOrders,
        totalTests,
        todayOrders,
        todayPatients,
        todayRevenue,
        dbSizeMb: Math.round(dbSizeMb * 100) / 100,
        machineIdHash: licenseStatus.license?.machine_id_hash || null,
      };
    } catch (e: any) {
      console.warn('Admin Service: Failed to collect stats:', e.message);
      return {};
    }
  }

  private loadConfig(): void {
    try {
      if (fs.existsSync(this.configPath)) {
        const content = fs.readFileSync(this.configPath, 'utf-8');
        this.config = JSON.parse(content);
      }
    } catch (e) {
      console.warn('Admin Service: Failed to load config:', e);
    }
  }

  private saveConfig(): void {
    try {
      fs.writeFileSync(this.configPath, JSON.stringify(this.config, null, 2), 'utf-8');
    } catch (e) {
      console.warn('Admin Service: Failed to save config:', e);
    }
  }
}

// Singleton
let adminServiceInstance: AdminService | null = null;

export function getAdminService(): AdminService {
  if (!adminServiceInstance) {
    adminServiceInstance = new AdminService();
  }
  return adminServiceInstance;
}

export default AdminService;
