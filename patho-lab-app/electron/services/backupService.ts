import { getDb, closeDatabase, initDatabase } from '../database/db';
import { app, dialog } from 'electron';
import * as fs from 'fs';
import * as path from 'path';
import * as zlib from 'zlib';
import * as crypto from 'crypto';
import { S3Client, PutObjectCommand, ListObjectsV2Command, GetObjectCommand } from '@aws-sdk/client-s3';
import { getLabSettings } from './reportService';

const DB_FILENAME = 'patholab.db';

function getS3Client(settings: Record<string, string>) {
    const accountId = settings.r2_account_id;
    const accessKeyId = settings.r2_access_key_id;
    const secretAccessKey = settings.r2_secret_access_key;

    if (!accountId || !accessKeyId || !secretAccessKey) {
        throw new Error('R2 credentials not configured');
    }

    return new S3Client({
        region: 'auto',
        endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
        credentials: {
            accessKeyId,
            secretAccessKey,
        },
    });
}

function getDbPath(): string {
    return path.join(app.getPath('userData'), DB_FILENAME);
}

export async function createBackup(): Promise<{ success: boolean; filePath?: string; error?: string }> {
    try {
        const result = await dialog.showSaveDialog({
            title: 'Save Database Backup',
            defaultPath: `patholab-backup-${new Date().toISOString().slice(0, 10)}.db`,
            filters: [
                { name: 'SQLite Database', extensions: ['db'] },
                { name: 'All Files', extensions: ['*'] }
            ]
        });

        if (result.canceled || !result.filePath) {
            return { success: false, error: 'Backup cancelled' };
        }

        const db = getDb();
        db.exec(`VACUUM INTO '${result.filePath.replace(/'/g, "''")}'`);

        return { success: true, filePath: result.filePath };
    } catch (e: any) {
        console.error('Backup error:', e);
        return { success: false, error: e.message };
    }
}

export async function restoreBackup(): Promise<{ success: boolean; error?: string }> {
    try {
        const result = await dialog.showOpenDialog({
            title: 'Select Backup File to Restore',
            filters: [
                { name: 'SQLite Database', extensions: ['db'] },
                { name: 'All Files', extensions: ['*'] }
            ],
            properties: ['openFile']
        });

        if (result.canceled || result.filePaths.length === 0) {
            return { success: false, error: 'Restore cancelled' };
        }

        const backupPath = result.filePaths[0];

        // Validate the backup file is a valid SQLite database
        const Database = (await import('better-sqlite3')).default;
        const testDb = new Database(backupPath, { readonly: true });
        try {
            const check = testDb.pragma('integrity_check') as any[];
            if (!check || check.length === 0 || check[0].integrity_check !== 'ok') {
                testDb.close();
                return { success: false, error: 'Backup file is corrupted or not a valid database' };
            }
        } finally {
            testDb.close();
        }

        // Close current database
        closeDatabase();

        // Copy backup over current database
        const dbPath = getDbPath();
        fs.copyFileSync(backupPath, dbPath);

        // Also remove WAL and SHM files if they exist
        const walPath = dbPath + '-wal';
        const shmPath = dbPath + '-shm';
        if (fs.existsSync(walPath)) fs.unlinkSync(walPath);
        if (fs.existsSync(shmPath)) fs.unlinkSync(shmPath);

        // Re-initialize
        initDatabase();

        return { success: true };
    } catch (e: any) {
        console.error('Restore error:', e);
        // Try to re-initialize even on error
        try { initDatabase(); } catch (_) { /* ignore */ }
        return { success: false, error: e.message };
    }
}

function encrypt(buffer: Buffer, keyString: string): Buffer {
    const salt = crypto.randomBytes(16);
    // Derive a 32-byte key using scrypt
    const key = crypto.scryptSync(keyString, salt, 32);
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
    
    const encrypted = Buffer.concat([cipher.update(buffer), cipher.final()]);
    const tag = cipher.getAuthTag();
    
    // Format: [salt(16)][iv(12)][tag(16)][encrypted_data]
    return Buffer.concat([salt, iv, tag, encrypted]);
}

function decrypt(buffer: Buffer, keyString: string): Buffer {
    if (buffer.length < 44) throw new Error('Invalid encrypted buffer');
    
    const salt = buffer.subarray(0, 16);
    const iv = buffer.subarray(16, 28);
    const tag = buffer.subarray(28, 44);
    const encrypted = buffer.subarray(44);
    
    const key = crypto.scryptSync(keyString, salt, 32);
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(tag);
    
    return Buffer.concat([decipher.update(encrypted), decipher.final()]);
}

export async function createCloudBackup(): Promise<{ success: boolean; filePath?: string; error?: string }> {
    let tempDbPath = '';
    try {
        const settings = getLabSettings();
        const encryptionKey = settings.backup_encryption_key || 'pathodesk-default-secure-key';
        const bucket = settings.r2_bucket_name;
        
        if (!bucket) throw new Error('Cloud storage (R2) bucket not configured in settings');

        // 1. Create a safe copy of the DB using VACUUM INTO
        tempDbPath = path.join(app.getPath('temp'), `backup-${Date.now()}.db`);
        const db = getDb();
        db.exec(`VACUUM INTO '${tempDbPath.replace(/'/g, "''")}'`);

        // 2. Read, Compress (Gzip), and Encrypt
        let data = fs.readFileSync(tempDbPath);
        data = zlib.gzipSync(data);
        const encryptedData = encrypt(data, encryptionKey);

        // 3. Upload to R2
        const client = getS3Client(settings);
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        
        // Use license ID for isolation
        const { getLicenseService } = await import('./licenseService');
        const licenseStatus = getLicenseService().getStatus();
        const labId = licenseStatus.license?.license_id || 'generic-lab';
        
        const key = `backups/${labId}/${timestamp}.db.enc.gz`;

        await client.send(new PutObjectCommand({
            Bucket: bucket,
            Key: key,
            Body: encryptedData,
            ContentType: 'application/octet-stream',
            Metadata: {
                'original-name': DB_FILENAME,
                'created-at': new Date().toISOString()
            }
        }));

        return { success: true, filePath: key };
    } catch (e: any) {
        console.error('Cloud backup error:', e);
        return { success: false, error: e.message };
    } finally {
        if (tempDbPath && fs.existsSync(tempDbPath)) {
            try { fs.unlinkSync(tempDbPath); } catch (_) {}
        }
    }
}

export async function listCloudBackups(): Promise<{ success: boolean; backups?: any[]; error?: string }> {
    try {
        const settings = getLabSettings();
        const bucket = settings.r2_bucket_name;
        if (!bucket) throw new Error('Cloud storage not configured');

        const client = getS3Client(settings);
        const { getLicenseService } = await import('./licenseService');
        const licenseStatus = getLicenseService().getStatus();
        const labId = licenseStatus.license?.license_id || 'generic-lab';

        const response = await client.send(new ListObjectsV2Command({
            Bucket: bucket,
            Prefix: `backups/${labId}/`,
        }));

        const backups = (response.Contents || [])
            .map(item => ({
                key: item.Key,
                size: item.Size,
                lastModified: item.LastModified,
                name: path.basename(item.Key || '')
            }))
            .sort((a, b) => (b.lastModified?.getTime() || 0) - (a.lastModified?.getTime() || 0));

        return { success: true, backups };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

export async function restoreFromCloud(key: string): Promise<{ success: boolean; error?: string }> {
    try {
        const settings = getLabSettings();
        const encryptionKey = settings.backup_encryption_key || 'pathodesk-default-secure-key';
        const bucket = settings.r2_bucket_name;

        if (!bucket) throw new Error('Cloud storage not configured');

        // 1. Download from R2
        const client = getS3Client(settings);
        const response = await client.send(new GetObjectCommand({
            Bucket: bucket,
            Key: key,
        }));

        const body = await response.Body?.transformToByteArray();
        if (!body) throw new Error('Failed to download backup content');

        // 2. Decrypt and Decompress
        let data = decrypt(Buffer.from(body), encryptionKey);
        data = zlib.gunzipSync(data);

        // 3. Save to temp file and validate
        const tempPath = path.join(app.getPath('temp'), 'restore-temp.db');
        fs.writeFileSync(tempPath, data);

        const Database = (await import('better-sqlite3')).default;
        const testDb = new Database(tempPath, { readonly: true });
        try {
            const check = testDb.pragma('integrity_check') as any[];
            if (!check || check.length === 0 || check[0].integrity_check !== 'ok') {
                throw new Error('Downloaded backup is corrupted or invalid');
            }
        } finally {
            testDb.close();
        }

        // 4. Overwrite current DB
        closeDatabase();
        fs.copyFileSync(tempPath, getDbPath());
        
        // Remove journals
        const dbPath = getDbPath();
        const walPath = dbPath + '-wal';
        const shmPath = dbPath + '-shm';
        if (fs.existsSync(walPath)) fs.unlinkSync(walPath);
        if (fs.existsSync(shmPath)) fs.unlinkSync(shmPath);

        fs.unlinkSync(tempPath);
        initDatabase();

        return { success: true };
    } catch (e: any) {
        console.error('Cloud restore error:', e);
        try { initDatabase(); } catch (_) {}
        return { success: false, error: e.message };
    }
}

export function checkIntegrity(): { success: boolean; results: string[]; foreignKeyErrors: any[] } {
    try {
        const db = getDb();
        const integrityResults = db.pragma('integrity_check') as any[];
        const fkResults = db.pragma('foreign_key_check') as any[];

        const results = integrityResults.map((r: any) => r.integrity_check || JSON.stringify(r));

        return {
            success: results.length === 1 && results[0] === 'ok' && fkResults.length === 0,
            results,
            foreignKeyErrors: fkResults
        };
    } catch (e: any) {
        return {
            success: false,
            results: [`Error: ${e.message}`],
            foreignKeyErrors: []
        };
    }
}
