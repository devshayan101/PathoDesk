import bcrypt from 'bcryptjs';
import { queryAll, queryOne, run, runWithId } from '../database/db';

interface UserRow {
    id: number;
    username: string;
    full_name: string;
    role_id: number;
    role_name: string;
    is_active: number;
    created_at: string;
}

// List all users with their roles
export function listUsers(): UserRow[] {
    return queryAll<UserRow>(`
    SELECT u.id, u.username, u.full_name, u.role_id, r.name as role_name, u.is_active, u.created_at
    FROM users u
    JOIN roles r ON u.role_id = r.id
    ORDER BY u.created_at DESC
  `);
}

// Get single user
export function getUser(id: number): UserRow | undefined {
    return queryOne<UserRow>(`
    SELECT u.id, u.username, u.full_name, u.role_id, r.name as role_name, u.is_active
    FROM users u
    JOIN roles r ON u.role_id = r.id
    WHERE u.id = ?
  `, [id]);
}

// Create new user
export function createUser(data: {
    username: string;
    password: string;
    fullName: string;
    roleId: number;
}): { success: boolean; userId?: number; error?: string } {
    try {
        // Check if username exists
        const existing = queryOne<{ id: number }>('SELECT id FROM users WHERE username = ?', [data.username]);
        if (existing) {
            return { success: false, error: 'Username already exists' };
        }

        // Hash password
        const passwordHash = bcrypt.hashSync(data.password, 10);

        const userId = runWithId(`
      INSERT INTO users (username, password_hash, full_name, role_id, is_active, created_at)
      VALUES (?, ?, ?, ?, 1, datetime('now'))
    `, [data.username, passwordHash, data.fullName, data.roleId]);

        return { success: true, userId };
    } catch (error: any) {
        console.error('Create user error:', error);
        return { success: false, error: error.message };
    }
}

// Update user
export function updateUser(id: number, data: {
    fullName?: string;
    roleId?: number;
    password?: string;
}): { success: boolean; error?: string } {
    try {
        const sets: string[] = [];
        const params: any[] = [];

        if (data.fullName) { sets.push('full_name = ?'); params.push(data.fullName); }
        if (data.roleId) { sets.push('role_id = ?'); params.push(data.roleId); }
        if (data.password) {
            sets.push('password_hash = ?');
            params.push(bcrypt.hashSync(data.password, 10));
        }

        if (sets.length > 0) {
            params.push(id);
            run(`UPDATE users SET ${sets.join(', ')} WHERE id = ?`, params);
        }

        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

// Toggle user active status
export function toggleUserActive(id: number): { success: boolean; error?: string } {
    try {
        run('UPDATE users SET is_active = CASE WHEN is_active = 1 THEN 0 ELSE 1 END WHERE id = ?', [id]);
        return { success: true };
    } catch (error: any) {
        return { success: false, error: error.message };
    }
}

// List roles
export function listRoles(): { id: number; name: string }[] {
    return queryAll<{ id: number; name: string }>('SELECT id, name FROM roles ORDER BY id');
}
