import { NavLink, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useAuthStore } from '../../stores/authStore';
import { useLicenseStore } from '../../stores/licenseStore';
import { ThemeToggle } from './ThemeToggle';
import type { LicenseModule } from '../../types';
import logoUrl from '/results_bg_image.png';
import './Layout.css';

interface NavItem {
    path: string;
    label: string;
    roles: string[];
    requiredModule?: LicenseModule;
}

const navItems: NavItem[] = [
    { path: '/', label: 'Dashboard', roles: ['admin', 'receptionist', 'technician', 'pathologist', 'auditor'] },
    { path: '/patients', label: 'Patients', roles: ['admin', 'receptionist', 'technician', 'pathologist'] },
    { path: '/orders', label: 'Orders', roles: ['admin', 'receptionist', 'technician', 'pathologist'] },
    { path: '/samples', label: 'Samples', roles: ['admin', 'technician', 'pathologist'] },
    { path: '/results', label: 'Results', roles: ['admin', 'technician', 'pathologist'] },
    { path: '/qc', label: 'QC', roles: ['admin', 'technician'], requiredModule: 'QC_AUDIT' },
    { path: '/billing/invoices', label: 'Billing', roles: ['admin', 'receptionist'] },
    { path: '/test-master', label: 'Test Master', roles: ['admin'] },
    { path: '/doctors', label: 'Doctors', roles: ['admin', 'receptionist'] },
    { path: '/admin/price-lists', label: 'Price Lists', roles: ['admin'] },
    { path: '/audit', label: 'Audit Log', roles: ['admin', 'auditor'], requiredModule: 'QC_AUDIT' },
    // { path: '/admin/license', label: 'License', roles: ['admin'] },
    { path: '/admin/backup', label: 'Backup', roles: ['admin'] },
    { path: '/admin', label: 'Admin', roles: ['admin'] },
    { path: '/contact', label: 'Contact Us', roles: ['admin', 'receptionist', 'technician', 'pathologist', 'auditor'] },
];

function LicenseStatusBadge() {
    const { status, loadStatus } = useLicenseStore();
    const navigate = useNavigate();

    useEffect(() => {
        loadStatus();
    }, []);

    if (!status) return null;

    const getStateInfo = () => {
        switch (status.state) {
            case 'VALID':
                return { color: '#22c55e', icon: '✓', label: 'Licensed' };
            case 'NEAR_EXPIRY':
                return { color: '#f59e0b', icon: '⚠', label: `${status.daysUntilExpiry}d left` };
            case 'GRACE_PERIOD':
                return { color: '#f59e0b', icon: '⚠', label: 'Grace Period' };
            case 'EXPIRED':
                return { color: '#ef4444', icon: '✗', label: 'Expired' };
            case 'INVALID':
                return { color: '#ef4444', icon: '✗', label: 'Invalid' };
            case 'NO_LICENSE':
                return { color: '#6b7280', icon: '?', label: 'Unlicensed' };
            default:
                return { color: '#6b7280', icon: '?', label: status.state };
        }
    };

    const info = getStateInfo();

    return (
        <button
            className="license-badge"
            style={{
                background: `${info.color}20`,
                borderColor: info.color,
                color: info.color
            }}
            onClick={() => navigate('/admin/license')}
            title={status.message}
        >
            <span className="license-icon">{info.icon}</span>
            <span className="license-label">{info.label}</span>
        </button>
    );
}

export function Header() {
    const { session, logout } = useAuthStore();
    const { status } = useLicenseStore();
    const [enabledModules, setEnabledModules] = useState<Set<LicenseModule>>(new Set());

    useEffect(() => {
        // Build set of enabled modules from license
        if (status?.license) {
            if (status.license.edition === 'ENTERPRISE') {
                setEnabledModules(new Set(['BILLING', 'QC_AUDIT', 'ANALYZER', 'INVENTORY', 'DOCTOR_COMMISSION']));
            } else {
                setEnabledModules(new Set(status.license.enabled_modules));
            }
        } else if (!window.electronAPI) {
            // Dev mode - all modules enabled
            setEnabledModules(new Set(['BILLING', 'QC_AUDIT', 'ANALYZER', 'INVENTORY', 'DOCTOR_COMMISSION']));
        }
    }, [status]);

    const isNavItemVisible = (item: NavItem): boolean => {
        // Check role
        if (!session || !item.roles.includes(session.role)) {
            return false;
        }

        // Check module requirement
        if (item.requiredModule && !enabledModules.has(item.requiredModule)) {
            return false;
        }

        return true;
    };

    return (
        <header className="app-header">
            <div className="header-brand">
                <img src={logoUrl} alt="PathoDesk Logo" className="header-logo" />
                <div className="brand-text">
                    PathoDesk <span className="lab-name">
                        ({status?.license?.lab_name || 'ABC Diagnostics'})
                    </span>
                </div>
            </div>

            <nav className="header-nav">
                {navItems.filter(isNavItemVisible).map(item => (
                    <NavLink
                        key={item.path}
                        to={item.path}
                        className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                    >
                        {item.label}
                    </NavLink>
                ))}
            </nav>

            <div className="header-user">
                <LicenseStatusBadge />
                <ThemeToggle />
                <div className="user-dropdown">
                    <span className="user-name">{session?.fullName}</span>
                    <span className="user-role">({session?.role})</span>
                    <button className="btn-logout" onClick={logout}>Logout</button>
                </div>
            </div>
        </header>
    );
}

interface MainLayoutProps {
    children: React.ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
    return (
        <div className="app-layout">
            <Header />
            <main className="app-main">
                {children}
            </main>
            <footer className="app-footer">
                Software by — <strong>FMS Software Solutions</strong>
            </footer>
        </div>
    );
}
