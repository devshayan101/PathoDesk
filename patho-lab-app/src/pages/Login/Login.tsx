import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import logoUrl from '../../assets/pathoDesk_logo.png';
import './Login.css';

export default function LoginPage() {
    const [username, setUsername] = useState('');
    const passwordRef = useRef<HTMLInputElement>(null);
    const [rememberMe, setRememberMe] = useState(false);
    const [isRememberEnabled, setIsRememberEnabled] = useState(false);
    const { login, isLoading, error, clearError } = useAuthStore();
    const navigate = useNavigate();

    useEffect(() => {
        const init = async () => {
            // Check if remember me feature is enabled
            if (window.electronAPI) {
                try {
                    const settings = await window.electronAPI.labSettings.get();
                    const enabled = settings.enable_remember_me === 'true' || settings.enable_remember_me === true;
                    setIsRememberEnabled(enabled);

                    if (enabled) {
                        // Use secure IPC to get credentials
                        const creds = await (window.electronAPI as any).credentials.get();
                        if (creds) {
                            setUsername(creds.username);
                            if (passwordRef.current) {
                                passwordRef.current.value = creds.password;
                            }
                            setRememberMe(true);
                        }
                    }
                } catch (e) {
                    console.error('Failed to load lab settings:', e);
                }
            }
        };
        init();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const password = passwordRef.current?.value || '';
        const success = await login(username, password);
        if (success) {
            // Guard for non-Electron environments and ensure navigation proceeds even if credential storage fails
            if (window.electronAPI) {
                const credsAPI = (window.electronAPI as any).credentials;
                try {
                    if (rememberMe && isRememberEnabled) {
                        await credsAPI.store({ username, password });
                    } else {
                        await credsAPI.delete();
                    }
                } catch (err) {
                    console.error('Failed to update remembered credentials:', err);
                }
            }
            
            // Clear password from ref after successful login
            if (passwordRef.current) {
                passwordRef.current.value = '';
            }
            
            navigate('/');
        }
    };

    return (
        <div className="login-page">
            <div className="login-overlay"></div>
            <div className="login-card">
                <div className="login-header">
                    <img src={logoUrl} alt="PathoDesk Logo" className="login-logo" />
                    <h2>Pathology Lab Management System</h2>
                </div>

                <form className="login-form" onSubmit={handleSubmit}>
                    {error && (
                        <div className="error-banner">
                            {error}
                            <button type="button" onClick={clearError}>×</button>
                        </div>
                    )}

                    <div className="form-group">
                        <label htmlFor="username">Username</label>
                        <input
                            id="username"
                            className="input"
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            placeholder="Enter username"
                            autoFocus
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="password">Password</label>
                        <input
                            id="password"
                            ref={passwordRef}
                            className="input"
                            type="password"
                            placeholder="Enter password"
                            required
                        />
                    </div>

                    {isRememberEnabled && (
                        <div className="form-group remember-me-group">
                            <label className="checkbox-container">
                                <input
                                    type="checkbox"
                                    checked={rememberMe}
                                    onChange={(e) => setRememberMe(e.target.checked)}
                                />
                                <span className="checkmark"></span>
                                Remember Me
                            </label>
                        </div>
                    )}

                    <button type="submit" className="btn btn-primary login-btn" disabled={isLoading}>
                        {isLoading ? 'Signing in...' : 'Sign In'}
                    </button>
                </form>

                <div className="login-footer">
                    <span className="status-dot status-success"></span>
                    Licensed | Valid until 2027
                </div>
            </div>
        </div>
    );
}
