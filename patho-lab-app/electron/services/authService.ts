import bcrypt from 'bcryptjs';
import { queryOne } from '../database/db';
import { logAudit, ENTITIES, ACTIONS } from './auditService';
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
      WHERE u.username = ?
    `, [username]);

        console.log('AuthService: user found:', user ? { id: user.id, username: user.username } : 'NOT FOUND');

        if (!user) {
            // Log failed login attempt (user not found)
            logAudit({
                entity: ENTITIES.USER,
                entityId: null,
                action: ACTIONS.LOGIN_FAILED,
                newValue: { username, reason: 'User not found' },
                performedBy: undefined
            });
            return { success: false, error: 'Invalid username or password' };
        }

        // Check if user is active
        if (user.is_active !== 1) {
            logAudit({
                entity: ENTITIES.USER,
                entityId: user.id,
                action: ACTIONS.LOGIN_FAILED,
                newValue: { username, reason: 'Account inactive' },
                performedBy: undefined
            });
            return { success: false, error: 'Account is inactive' };
        }

        console.log('AuthService: comparing password with hash...');
        const valid = await bcrypt.compare(password, user.password_hash);
        console.log('AuthService: password valid:', valid);

        if (!valid) {
            // Log failed login attempt (wrong password)
            logAudit({
                entity: ENTITIES.USER,
                entityId: user.id,
                action: ACTIONS.LOGIN_FAILED,
                newValue: { username, reason: 'Invalid password' },
                performedBy: undefined
            });
            return { success: false, error: 'Invalid username or password' };
        }

        currentSession = {
            userId: user.id,
            username: user.username,
            fullName: user.full_name,
            role: user.role_name as Session['role'],
        };

        // Log successful login
        logAudit({
            entity: ENTITIES.USER,
            entityId: user.id,
            action: ACTIONS.LOGIN,
            newValue: { username, role: user.role_name },
            performedBy: user.id
        });

        console.log('AuthService: login successful, session created');
        return { success: true, session: currentSession };
    } catch (error) {
        console.error('AuthService: Login error:', error);
        return { success: false, error: 'Login failed' };
    }
}

export function logout(): void {
    if (currentSession) {
        logAudit({
            entity: ENTITIES.USER,
            entityId: currentSession.userId,
            action: ACTIONS.LOGOUT,
            newValue: { username: currentSession.username },
            performedBy: currentSession.userId
        });
        currentSession = null;
    }
}

export function getSession(): Session | null {
    return currentSession;
}

export function requireRole(roles: string[]): boolean {
    return currentSession !== null && roles.includes(currentSession.role);
}

