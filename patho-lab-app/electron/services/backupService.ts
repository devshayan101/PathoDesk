import { getDb, closeDatabase, initDatabase } from '../database/db';
import { app, dialog } from 'electron';
import * as fs from 'fs';
import * as path from 'path';

const DB_FILENAME = 'patholab.db';

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
