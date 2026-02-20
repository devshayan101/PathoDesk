/**
 * License Service - Core licensing engine for Patho Lab Software
 * 
 * Handles:
 * - License file validation with RSA-PSS digital signatures
 * - Machine fingerprint generation and binding
 * - Module-based feature gating
 * - License state management (Valid, NearExpiry, GracePeriod, Expired, Invalid)
 * - Clock rollback detection
 * - Audit logging for license events
 */

import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import { app } from 'electron';

// Embedded public key for signature verification (RSA 2048-bit)
const PUBLIC_KEY = `-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA0HbWjSzWlBEwSEw90A9k
nB4YgISxQNWYMhpka5d0zgGQr7iFyv/5E4rjEw4KRtjnWtLBMCcOJBGQqbDFDdlE
8Ck+JOBeM4Y6xWk4INSZ+mOHLL1K7CoTvOn6Oh5JuxkpQQPLlEeGP/VmAlOWy0nT
zWuXAtilqS+cb7mJi8ZJd5w7/HSvdLoSJsPwg/IC/rzFI9SpjzfGCDnor4suaqzw
wS+OyqTaCMpr8nfOIQMwua4+NBsZ4138GYmby6gJm2V+YwtqoXagpH1S7kPd1cwF
JSARfjejfYNAUSKsinx6ue6rAVqk1jgcsUJs1b0wBmDJoeUTjQeod6zArz+ZDJtE
2QIDAQAB
-----END PUBLIC KEY-----`;

// License types
export type LicenseType = 'TRIAL' | 'ANNUAL' | 'PERPETUAL' | 'ENTERPRISE';
export type BindingMode = 'NONE' | 'SOFT' | 'STRICT';
export type LicenseState = 'VALID' | 'NEAR_EXPIRY' | 'GRACE_PERIOD' | 'EXPIRED' | 'INVALID' | 'NO_LICENSE';
export type LicenseModule = 'BILLING' | 'QC_AUDIT' | 'ANALYZER' | 'INVENTORY' | 'DOCTOR_COMMISSION';

export interface LicenseData {
    license_id: string;
    lab_name: string;
    issued_to: string;
    machine_id_hash: string | null;  // null for NONE binding
    edition: LicenseType;
    binding_mode: BindingMode;
    enabled_modules: LicenseModule[];
    max_users: number;
    issue_date: string;  // ISO date
    expiry_date: string; // ISO date
    grace_period_days: number;
}

export interface SignedLicense {
    data: LicenseData;
    signature: string;  // Base64 encoded RSA-PSS signature
}

export interface LicenseStatus {
    state: LicenseState;
    license: LicenseData | null;
    daysUntilExpiry: number | null;
    graceDaysRemaining: number | null;
    machineIdMatch: boolean;
    machineIdMismatchType: 'NONE' | 'MINOR' | 'MAJOR' | null;
    message: string;
}

// Configuration
const NEAR_EXPIRY_DAYS = 14;  // Show warning when 14 days or less until expiry
const LICENSE_FILE_NAME = 'license.lic';
const LAST_RUN_FILE = 'last_run.dat';

class LicenseService {
    private license: SignedLicense | null = null;
    private licenseStatus: LicenseStatus | null = null;
    private licensePath: string;
    private lastRunPath: string;
    private publicKey: crypto.KeyObject | null = null;


    constructor() {
        const userDataPath = app.getPath('userData');
        this.licensePath = path.join(userDataPath, LICENSE_FILE_NAME);
        this.lastRunPath = path.join(userDataPath, LAST_RUN_FILE);

        // Try to load the public key, but handle errors gracefully
        try {
            this.publicKey = crypto.createPublicKey(PUBLIC_KEY);
        } catch (e: any) {
            console.warn('License public key initialization failed:', e.message);
            // this.keyError = 'License key not configured. Running in development mode.';
            // In dev mode without valid key, we'll allow all features
        }
    }

    /**
     * Initialize the license service - call on app startup
     */
    async initialize(): Promise<LicenseStatus> {
        // Check for clock rollback
        if (this.detectClockRollback()) {
            return {
                state: 'INVALID',
                license: null,
                daysUntilExpiry: null,
                graceDaysRemaining: null,
                machineIdMatch: false,
                machineIdMismatchType: null,
                message: 'System clock tampering detected. Please contact support.'
            };
        }

        // Update last run timestamp
        this.updateLastRunTimestamp();

        // Load and validate license
        return this.validateLicense();
    }

    /**
     * Get current license status
     */
    getStatus(): LicenseStatus {
        if (!this.licenseStatus) {
            return {
                state: 'NO_LICENSE',
                license: null,
                daysUntilExpiry: null,
                graceDaysRemaining: null,
                machineIdMatch: false,
                machineIdMismatchType: null,
                message: 'No license file found. Please upload a valid license.'
            };
        }
        return this.licenseStatus;
    }

    /**
     * Check if a specific module is enabled
     */
    isModuleEnabled(module: LicenseModule): boolean {
        if (!this.license || !this.licenseStatus) return false;

        // Invalid or expired license - no modules enabled
        if (this.licenseStatus.state === 'INVALID' || this.licenseStatus.state === 'EXPIRED') {
            return false;
        }

        // Enterprise has all modules
        if (this.license.data.edition === 'ENTERPRISE') {
            return true;
        }

        // Trial has limited modules
        if (this.license.data.edition === 'TRIAL') {
            // Trial: only basic billing, no QC_AUDIT, ANALYZER, DOCTOR_COMMISSION
            const trialAllowedModules: LicenseModule[] = ['BILLING', 'INVENTORY'];
            return trialAllowedModules.includes(module);
        }

        // Check enabled modules list
        return this.license.data.enabled_modules.includes(module);
    }

    /**
     * Check if billing operations are allowed
     */
    canPerformBilling(): boolean {
        if (!this.licenseStatus) return false;

        // Expired license blocks billing
        if (this.licenseStatus.state === 'EXPIRED' || this.licenseStatus.state === 'INVALID') {
            return false;
        }

        return this.isModuleEnabled('BILLING');
    }

    /**
     * Check if report finalization is allowed
     */
    canFinalizeReport(): boolean {
        if (!this.licenseStatus) return false;

        // Expired license blocks finalization
        if (this.licenseStatus.state === 'EXPIRED' || this.licenseStatus.state === 'INVALID') {
            return false;
        }

        return true;
    }

    /**
     * Check if this is a trial license (for watermark on reports)
     */
    isTrial(): boolean {
        return this.license?.data.edition === 'TRIAL';
    }

    /**
     * Generate machine fingerprint
     */
    async getMachineId(): Promise<string> {
        return this.generateMachineFingerprint();
    }

    /**
     * Upload and validate a new license file
     */
    async uploadLicense(fileContent: string): Promise<{ success: boolean; status: LicenseStatus; error?: string }> {
        try {
            // Parse the license file
            const signedLicense = JSON.parse(fileContent) as SignedLicense;

            // Verify signature
            if (!this.verifySignature(signedLicense)) {
                return {
                    success: false,
                    status: {
                        state: 'INVALID',
                        license: null,
                        daysUntilExpiry: null,
                        graceDaysRemaining: null,
                        machineIdMatch: false,
                        machineIdMismatchType: null,
                        message: 'Invalid license signature. The license file may be corrupted or tampered.'
                    },
                    error: 'Invalid signature'
                };
            }

            // Save to disk
            fs.writeFileSync(this.licensePath, fileContent, 'utf-8');

            // Reload and validate
            const status = await this.validateLicense();

            return {
                success: status.state !== 'INVALID',
                status
            };
        } catch (e: any) {
            return {
                success: false,
                status: {
                    state: 'INVALID',
                    license: null,
                    daysUntilExpiry: null,
                    graceDaysRemaining: null,
                    machineIdMatch: false,
                    machineIdMismatchType: null,
                    message: 'Failed to parse license file. Please upload a valid license.'
                },
                error: e.message
            };
        }
    }

    /**
     * Validate the license file
     */
    private async validateLicense(): Promise<LicenseStatus> {
        try {
            // Check if license file exists
            if (!fs.existsSync(this.licensePath)) {
                this.licenseStatus = {
                    state: 'NO_LICENSE',
                    license: null,
                    daysUntilExpiry: null,
                    graceDaysRemaining: null,
                    machineIdMatch: false,
                    machineIdMismatchType: null,
                    message: 'No license file found. Running in demo mode.'
                };
                return this.licenseStatus;
            }

            // Read and parse license
            const content = fs.readFileSync(this.licensePath, 'utf-8');
            const signedLicense = JSON.parse(content) as SignedLicense;

            // Step 1: Verify digital signature
            if (!this.verifySignature(signedLicense)) {
                this.licenseStatus = {
                    state: 'INVALID',
                    license: null,
                    daysUntilExpiry: null,
                    graceDaysRemaining: null,
                    machineIdMatch: false,
                    machineIdMismatchType: null,
                    message: 'License signature verification failed. The license may be tampered.'
                };
                return this.licenseStatus;
            }

            this.license = signedLicense;
            const data = signedLicense.data;

            // Step 2: Check expiry
            const now = new Date();
            const expiryDate = new Date(data.expiry_date);
            const daysUntilExpiry = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

            // Step 3: Check machine binding
            const { match, mismatchType } = await this.checkMachineBinding(data);

            // Handle strict binding failure
            if (data.binding_mode === 'STRICT' && !match) {
                this.licenseStatus = {
                    state: 'INVALID',
                    license: data,
                    daysUntilExpiry,
                    graceDaysRemaining: null,
                    machineIdMatch: false,
                    machineIdMismatchType: mismatchType,
                    message: 'License is bound to a different machine. Please contact support for license transfer.'
                };
                return this.licenseStatus;
            }

            // Calculate grace period
            const graceDaysRemaining = daysUntilExpiry < 0
                ? data.grace_period_days + daysUntilExpiry
                : null;

            // Determine license state
            let state: LicenseState;
            let message: string;

            if (daysUntilExpiry < -data.grace_period_days) {
                // Beyond grace period
                state = 'EXPIRED';
                message = 'License has expired. Billing and report finalization are disabled.';
            } else if (daysUntilExpiry < 0) {
                // In grace period
                state = 'GRACE_PERIOD';
                message = `License expired. ${graceDaysRemaining} days remaining in grace period.`;
            } else if (daysUntilExpiry <= NEAR_EXPIRY_DAYS) {
                // Near expiry
                state = 'NEAR_EXPIRY';
                message = `License expires in ${daysUntilExpiry} days. Please renew soon.`;
            } else {
                // Valid
                state = 'VALID';
                message = `License valid until ${expiryDate.toLocaleDateString()}`;
            }

            // Add machine binding warning for soft mode
            if (data.binding_mode === 'SOFT' && !match) {
                message += ' Warning: Machine configuration has changed.';
            }

            this.licenseStatus = {
                state,
                license: data,
                daysUntilExpiry,
                graceDaysRemaining,
                machineIdMatch: match,
                machineIdMismatchType: mismatchType,
                message
            };

            return this.licenseStatus;

        } catch (e: any) {
            console.error('License validation error:', e);
            this.licenseStatus = {
                state: 'INVALID',
                license: null,
                daysUntilExpiry: null,
                graceDaysRemaining: null,
                machineIdMatch: false,
                machineIdMismatchType: null,
                message: 'Failed to read license file.'
            };
            return this.licenseStatus;
        }
    }

    /**
     * Verify the RSA-PSS signature on the license
     */
    private verifySignature(signedLicense: SignedLicense): boolean {
        // If public key is not configured:
        if (!this.publicKey) {
            if (app.isPackaged) {
                console.error('Security Error: License public key not configured in production build.');
            }
            return false;
        }

        try {
            const dataJson = JSON.stringify(signedLicense.data);
            const signature = Buffer.from(signedLicense.signature, 'base64');

            const verify = crypto.createVerify('RSA-SHA256');
            verify.update(dataJson);
            verify.end();

            return verify.verify(this.publicKey, signature);
        } catch (e) {
            console.error('Signature verification error:', e);
            return false;
        }
    }

    /**
     * Generate machine fingerprint from hardware identifiers
     */
    private generateMachineFingerprint(): string {
        try {
            const components: string[] = [];

            // Windows Machine GUID
            try {
                const machineGuid = execSync(
                    'reg query "HKLM\\SOFTWARE\\Microsoft\\Cryptography" /v MachineGuid',
                    { encoding: 'utf-8', windowsHide: true }
                );
                const guidMatch = machineGuid.match(/MachineGuid\s+REG_SZ\s+(\S+)/);
                if (guidMatch) {
                    components.push(`GUID:${guidMatch[1]}`);
                }
            } catch (e) {
                console.warn('Could not read Machine GUID');
            }

            // Primary disk serial
            try {
                const diskSerial = execSync(
                    'wmic diskdrive get serialnumber',
                    { encoding: 'utf-8', windowsHide: true }
                );
                const lines = diskSerial.split('\n').filter(l => l.trim() && !l.includes('SerialNumber'));
                if (lines.length > 0) {
                    components.push(`DISK:${lines[0].trim()}`);
                }
            } catch (e) {
                console.warn('Could not read disk serial');
            }

            // CPU identifier
            try {
                const cpuId = execSync(
                    'wmic cpu get processorid',
                    { encoding: 'utf-8', windowsHide: true }
                );
                const lines = cpuId.split('\n').filter(l => l.trim() && !l.includes('ProcessorId'));
                if (lines.length > 0) {
                    components.push(`CPU:${lines[0].trim()}`);
                }
            } catch (e) {
                console.warn('Could not read CPU ID');
            }

            // Combine and hash
            const combined = components.join('|');
            return crypto.createHash('sha256').update(combined).digest('hex');
        } catch (e) {
            console.error('Error generating machine fingerprint:', e);
            // Fallback to a basic identifier
            return crypto.createHash('sha256').update(app.getPath('userData')).digest('hex');
        }
    }

    /**
     * Check machine binding based on binding mode
     */
    private async checkMachineBinding(data: LicenseData): Promise<{ match: boolean; mismatchType: 'NONE' | 'MINOR' | 'MAJOR' | null }> {
        // No binding for trial licenses
        if (data.binding_mode === 'NONE' || !data.machine_id_hash) {
            return { match: true, mismatchType: null };
        }

        const currentMachineId = await this.getMachineId();
        const match = currentMachineId === data.machine_id_hash;

        if (match) {
            return { match: true, mismatchType: null };
        }

        // For soft binding, try to determine if it's a minor or major mismatch
        if (data.binding_mode === 'SOFT') {
            // In a real implementation, you'd compare individual components
            // For now, treat any mismatch as minor (allows continued operation)
            return { match: false, mismatchType: 'MINOR' };
        }

        // Strict binding - any mismatch is major
        return { match: false, mismatchType: 'MAJOR' };
    }

    /**
     * Detect system clock rollback
     */
    private detectClockRollback(): boolean {
        try {
            if (!fs.existsSync(this.lastRunPath)) {
                return false;
            }

            const lastRunStr = fs.readFileSync(this.lastRunPath, 'utf-8');
            const lastRun = new Date(lastRunStr);
            const now = new Date();

            // If current time is significantly before last run (more than 1 hour tolerance)
            const diff = now.getTime() - lastRun.getTime();
            if (diff < -3600000) { // -1 hour in ms
                console.warn('Clock rollback detected:', { lastRun, now, diff });
                return true;
            }

            return false;
        } catch (e) {
            console.warn('Could not check clock rollback:', e);
            return false;
        }
    }

    /**
     * Update last run timestamp
     */
    private updateLastRunTimestamp(): void {
        try {
            fs.writeFileSync(this.lastRunPath, new Date().toISOString(), 'utf-8');
        } catch (e) {
            console.warn('Could not update last run timestamp:', e);
        }
    }
}

// Singleton instance
let licenseServiceInstance: LicenseService | null = null;

export function getLicenseService(): LicenseService {
    if (!licenseServiceInstance) {
        licenseServiceInstance = new LicenseService();
    }
    return licenseServiceInstance;
}

export default LicenseService;
