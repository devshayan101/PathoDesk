import { NavLink } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import './Layout.css';

const navItems = [
    { path: '/', label: 'Dashboard', roles: ['admin', 'receptionist', 'technician', 'pathologist', 'auditor'] },
    { path: '/patients', label: 'Patients', roles: ['admin', 'receptionist', 'technician', 'pathologist'] },
    { path: '/orders', label: 'Orders', roles: ['admin', 'receptionist', 'technician', 'pathologist'] },
    { path: '/samples', label: 'Samples', roles: ['admin', 'technician', 'pathologist'] },
    { path: '/results', label: 'Results', roles: ['admin', 'technician', 'pathologist'] },
    { path: '/qc', label: 'QC', roles: ['admin', 'technician'] },
    { path: '/billing/invoices', label: 'Billing', roles: ['admin', 'receptionist'] },
    { path: '/test-master', label: 'Test Master', roles: ['admin'] },
    { path: '/doctors', label: 'Doctors', roles: ['admin', 'receptionist'] },
    { path: '/admin/price-lists', label: 'Price Lists', roles: ['admin'] },
    { path: '/audit', label: 'Audit Log', roles: ['admin', 'auditor'] },
    { path: '/admin', label: 'Admin', roles: ['admin'] },
];

import { ThemeToggle } from './ThemeToggle';

export function Header() {
    const { session, logout } = useAuthStore();

    return (
        <header className="app-header">
            <div className="header-brand">
                PathoDesk <span className="lab-name">(ABC Diagnostics)</span>
            </div>

            <nav className="header-nav">
                {navItems.filter(item => session && item.roles.includes(session.role)).map(item => (
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
        </div>
    );
}
