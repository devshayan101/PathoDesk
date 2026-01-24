import bcrypt from 'bcryptjs';
import { queryOne, run } from '../database/db';
import type { Session } from '../../src/types';

interface UserRow {
    id: number;
    username: string;
    password_hash: string;
    full_name: string;
    role_id: number;
    role_name: string;
    is_active: number;
}

let currentSession: Session | null = null;

export async function login(username: string, password: string): Promise<{ success: boolean; session?: Session; error?: string }> {
    console.log('AuthService: login attempt for user:', username);

    try {
        const user = queryOne<UserRow>(`
      SELECT u.id, u.username, u.password_hash, u.full_name, u.role_id, r.name as role_name, u.is_active
      FROM users u
      JOIN roles r ON u.role_id = r.id
      WHERE u.username = ? AND u.is_active = 1
    `, [username]);

        console.log('AuthService: user found:', user ? { id: user.id, username: user.username, hashLength: user.password_hash?.length } : 'NOT FOUND');

        if (!user) {
            return { success: false, error: 'Invalid username or password' };
        }

        console.log('AuthService: comparing password with hash...');
        const valid = await bcrypt.compare(password, user.password_hash);
        console.log('AuthService: password valid:', valid);

        if (!valid) {
            return { success: false, error: 'Invalid username or password' };
        }

        currentSession = {
            userId: user.id,
            username: user.username,
            fullName: user.full_name,
            role: user.role_name as Session['role'],
        };

        // Log the login
        logAudit('user', user.id, 'login');

        console.log('AuthService: login successful, session created');
        return { success: true, session: currentSession };
    } catch (error) {
        console.error('AuthService: Login error:', error);
        return { success: false, error: 'Login failed' };
    }
}

export function logout(): void {
    if (currentSession) {
        logAudit('user', currentSession.userId, 'logout');
        currentSession = null;
    }
}

export function getSession(): Session | null {
    return currentSession;
}

export function requireRole(roles: string[]): boolean {
    return currentSession !== null && roles.includes(currentSession.role);
}

function logAudit(entity: string, entityId: number, action: string): void {
    try {
        run(
            `INSERT INTO audit_log (entity, entity_id, action, performed_by, performed_at) VALUES (?, ?, ?, ?, datetime('now'))`,
            [entity, entityId, action, currentSession?.userId ?? null]
        );
    } catch (e) {
        console.error('Audit log error:', e);
    }
}
