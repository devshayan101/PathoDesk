import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useAuthStore } from './stores/authStore';
import { useLicenseStore } from './stores/licenseStore';
import { MainLayout } from './components/layout/Layout';
import ToastContainer from './components/Toast/Toast';
import LoginPage from './pages/Login/Login';
import DashboardPage from './pages/Dashboard/Dashboard';
import PatientsPage from './pages/Patients/Patients';
import OrdersPage from './pages/Orders/Orders';
import SamplesPage from './pages/Samples/Samples';
import ResultsPage from './pages/Results/Results';
import TestMasterPage from './pages/TestMaster/TestMaster';
import AdminPage from './pages/Admin/Admin';
import DoctorsPage from './pages/Doctors/Doctors';
import PriceListsPage from './pages/Admin/PriceLists';
import LicenseSettingsPage from './pages/Admin/LicenseSettings';
import InvoicesPage from './pages/Billing/Invoices';
import QCPage from './pages/QC/QC';
import AuditLogPage from './pages/Audit/AuditLog';
import UpgradeRequired from './pages/UpgradeRequired/UpgradeRequired';
import type { LicenseModule } from './types';
import { ErrorBoundary } from './components/ErrorBoundary';
import BackupRestorePage from './pages/Settings/BackupRestore';
import './index.css';

// Protected route wrapper
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { session } = useAuthStore();

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  return <MainLayout>{children}</MainLayout>;
}

// Licensed route wrapper - checks if required module is licensed
function LicensedRoute({
  children,
  requiredModule,
  featureName
}: {
  children: React.ReactNode;
  requiredModule: LicenseModule;
  featureName: string;
}) {
  const { session } = useAuthStore();
  const { status, loadStatus } = useLicenseStore();
  const [isLoading, setIsLoading] = useState(true);
  const [isEnabled, setIsEnabled] = useState(false);

  useEffect(() => {
    const checkLicense = async () => {
      if (!status) {
        await loadStatus();
      }
      setIsLoading(false);
    };
    checkLicense();
  }, []);

  useEffect(() => {
    if (status) {
      // Dev mode or Enterprise - all enabled
      if (!window.electronAPI || status.license?.edition === 'ENTERPRISE') {
        setIsEnabled(true);
        return;
      }

      // Check module
      setIsEnabled(status.license?.enabled_modules.includes(requiredModule) ?? false);
    }
  }, [status, requiredModule]);

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  if (isLoading) {
    return (
      <MainLayout>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
          Loading...
        </div>
      </MainLayout>
    );
  }

  if (!isEnabled) {
    return (
      <MainLayout>
        <UpgradeRequired module={requiredModule} featureName={featureName} />
      </MainLayout>
    );
  }

  return <MainLayout>{children}</MainLayout>;
}

function App() {
  return (
    <ErrorBoundary>
      <ToastContainer />
      <HashRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <DashboardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/patients"
            element={
              <ProtectedRoute>
                <PatientsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/orders"
            element={
              <ProtectedRoute>
                <OrdersPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/samples"
            element={
              <ProtectedRoute>
                <SamplesPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/results"
            element={
              <ProtectedRoute>
                <ResultsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/test-master"
            element={
              <ProtectedRoute>
                <TestMasterPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin"
            element={
              <ProtectedRoute>
                <AdminPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/doctors"
            element={
              <ProtectedRoute>
                <DoctorsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/price-lists"
            element={
              <ProtectedRoute>
                <PriceListsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/license"
            element={
              <ProtectedRoute>
                <LicenseSettingsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/billing/invoices"
            element={
              <ProtectedRoute>
                <InvoicesPage />
              </ProtectedRoute>
            }
          />
          {/* QC and Audit require QC_AUDIT module */}
          <Route
            path="/qc"
            element={
              <LicensedRoute requiredModule="QC_AUDIT" featureName="Quality Control">
                <QCPage />
              </LicensedRoute>
            }
          />
          <Route
            path="/audit"
            element={
              <LicensedRoute requiredModule="QC_AUDIT" featureName="Audit Trail">
                <AuditLogPage />
              </LicensedRoute>
            }
          />
          <Route
            path="/admin/backup"
            element={
              <ProtectedRoute>
                <BackupRestorePage />
              </ProtectedRoute>
            }
          />
        </Routes>
      </HashRouter>
    </ErrorBoundary>
  );
}

export default App;
