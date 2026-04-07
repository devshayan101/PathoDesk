import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { obfuscate, deobfuscate } from '../../utils/cryptoUtils';
import logoUrl from '../../assets/pathoDesk_logo.png';
import './Login.css';

export default function LoginPage() {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [rememberMe, setRememberMe] = useState(false);
    const { login, isLoading, error, clearError } = useAuthStore();
    const navigate = useNavigate();

    useEffect(() => {
        const init = async () => {
            // Load saved credentials if present
            const savedUser = localStorage.getItem('remembered_username');
            const savedPass = localStorage.getItem('remembered_password');
            
            if (savedUser && savedPass) {
                setUsername(savedUser);
                setPassword(deobfuscate(savedPass));
                setRememberMe(true);
            }
        };
        init();
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const success = await login(username, password);
        if (success) {
            if (rememberMe) {
                localStorage.setItem('remembered_username', username);
                localStorage.setItem('remembered_password', obfuscate(password));
            } else {
                localStorage.removeItem('remembered_username');
                localStorage.removeItem('remembered_password');
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
                            className="input"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Enter password"
                            required
                        />
                    </div>

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
