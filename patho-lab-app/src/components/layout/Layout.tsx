import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useEffect, useState, useRef } from 'react';
import { useAuthStore } from '../../stores/authStore';
import { useLicenseStore } from '../../stores/licenseStore';
import { ThemeToggle } from './ThemeToggle';
import type { LicenseModule } from '../../types';
import logoUrl from '/icon.png';
import {
    LayoutDashboard, Users, FileText, FlaskConical, Stethoscope,
    Receipt, Database, Settings, Phone, CheckCircle, Search, Save,
    LogOut, UserCircle, Shield, ChevronDown, Wrench
} from 'lucide-react';
import './Layout.css';

interface NavItem {
    path: string;
    label: string;
    icon: React.ReactNode;
    roles: string[];
    requiredModule?: LicenseModule;
}

const primaryNavItems: NavItem[] = [
    { path: '/', label: 'Overview', icon: <LayoutDashboard size={20} />, roles: ['admin', 'receptionist', 'technician', 'pathologist', 'auditor'] },
    { path: '/patients', label: 'Patients', icon: <Users size={20} />, roles: ['admin', 'receptionist', 'technician', 'pathologist'] },
    { path: '/orders', label: 'Orders', icon: <FileText size={20} />, roles: ['admin', 'receptionist', 'technician', 'pathologist'] },
    { path: '/samples', label: 'Samples', icon: <FlaskConical size={20} />, roles: ['admin', 'technician', 'pathologist'] },
    { path: '/results', label: 'Results', icon: <CheckCircle size={20} />, roles: ['admin', 'technician', 'pathologist'] },
    { path: '/billing/invoices', label: 'Billing', icon: <Receipt size={20} />, roles: ['admin', 'receptionist'] },
    { path: '/test-master', label: 'Tests', icon: <Database size={20} />, roles: ['admin'] },
    { path: '/doctors', label: 'Doctors', icon: <Stethoscope size={20} />, roles: ['admin', 'technician', 'pathologist'] },
    { path: '/admin/price-lists', label: 'Pricing', icon: <FileText size={20} />, roles: ['admin'] },
    { path: '/contact', label: 'Contact', icon: <Phone size={20} />, roles: ['admin', 'receptionist', 'technician', 'pathologist', 'auditor'] },
];

const adminDropdownItems: NavItem[] = [
    { path: '/qc', label: 'QC', icon: <Search size={20} />, roles: ['admin', 'technician'], requiredModule: 'QC_AUDIT' },
    { path: '/audit', label: 'Audit', icon: <Search size={20} />, roles: ['admin', 'auditor'], requiredModule: 'QC_AUDIT' },
    { path: '/admin/backup', label: 'Backup', icon: <Save size={20} />, roles: ['admin'] },
    { path: '/admin/license', label: 'License', icon: <Shield size={20} />, roles: ['admin'] },
    { path: '/admin', label: 'Settings', icon: <Settings size={20} />, roles: ['admin'] },
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

function AdminDropdown({ items, isNavItemVisible }: { items: NavItem[], isNavItemVisible: (item: NavItem) => boolean }) {
    const [open, setOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const location = useLocation();
    const navigate = useNavigate();

    const visibleItems = items.filter(isNavItemVisible);

    // Close dropdown on outside click
    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Close on route change
    useEffect(() => {
        setOpen(false);
    }, [location.pathname]);

    if (visibleItems.length === 0) return null;

    // Check if any child route is currently active
    const isChildActive = visibleItems.some(item => {
        if (item.path === '/admin') {
            return location.pathname === '/admin';
        }
        return location.pathname.startsWith(item.path);
    });

    return (
        <div className="nav-dropdown" ref={dropdownRef}>
            <button
                className={`nav-link nav-dropdown-trigger ${isChildActive ? 'active' : ''}`}
                onClick={() => setOpen(!open)}
                title="Admin"
            >
                <span className="nav-icon"><Wrench size={20} /></span>
                <span className="nav-label">Admin</span>
                <ChevronDown size={14} className={`dropdown-chevron ${open ? 'open' : ''}`} />
            </button>
            {open && (
                <div className="nav-dropdown-menu">
                    {visibleItems.map(item => (
                        <button
                            key={item.path}
                            className={`nav-dropdown-item ${item.path === '/admin'
                                    ? location.pathname === '/admin' ? 'active' : ''
                                    : location.pathname.startsWith(item.path) ? 'active' : ''
                                }`}
                            onClick={() => navigate(item.path)}
                        >
                            <span className="dropdown-item-icon">{item.icon}</span>
                            {item.label}
                        </button>
                    ))}
                </div>
            )}
        </div>
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
                {primaryNavItems.filter(isNavItemVisible).map(item => (
                    <NavLink
                        key={item.path}
                        to={item.path}
                        className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
                        title={item.label}
                    >
                        <span className="nav-icon">{item.icon}</span>
                        <span className="nav-label">{item.label}</span>
                    </NavLink>
                ))}
                <AdminDropdown items={adminDropdownItems} isNavItemVisible={isNavItemVisible} />
            </nav>

            <div className="header-user">
                <LicenseStatusBadge />
                <ThemeToggle />
                <div className="user-dropdown">
                    <div className="user-info">
                        <UserCircle size={24} className="user-avatar" />
                        <div className="user-text">
                            <span className="user-name">{session?.fullName}</span>
                            <span className="user-role">{session?.role}</span>
                        </div>
                    </div>
                    <button className="btn-logout" onClick={logout} title="Logout">
                        <LogOut size={18} />
                    </button>
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
