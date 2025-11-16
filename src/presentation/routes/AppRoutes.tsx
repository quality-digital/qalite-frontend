import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';

import { AuthProvider } from '../../application/context/AuthContext';
import { ProtectedRoute, RoleProtectedRoute } from '../../application/routes/ProtectedRoute';
import { ThemeProvider } from '../context/ThemeContext';
import { ToastProvider } from '../context/ToastContext';
import { AdminOrganizationsPage } from '../pages/AdminOrganizationsPage';
import { AdminStoresPage } from '../pages/AdminStoresPage';
import { ForbiddenPage } from '../pages/ForbiddenPage';
import { ForgotPasswordPage } from '../pages/ForgotPasswordPage';
import { HomePage } from '../pages/HomePage';
import { LoginPage } from '../pages/LoginPage';
import { ProfilePage } from '../pages/ProfilePage';
import { RegisterPage } from '../pages/RegisterPage';
import { UserDashboardPage } from '../pages/UserDashboardPage';
import { NoOrganizationPage } from '../pages/NoOrganizationPage';
import { OrganizationDashboardPage } from '../pages/OrganizationDashboardPage';
import { StoreSummaryPage } from '../pages/StoreSummaryPage';
import { EnvironmentPage } from '../pages/EnvironmentPage';

export const AppRoutes = () => (
  <ThemeProvider>
    <ToastProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/403" element={<ForbiddenPage />} />
            <Route path="/environment" element={<EnvironmentPage />} />

            <Route element={<ProtectedRoute />}>
              <Route path="/dashboard" element={<UserDashboardPage />} />
              <Route path="/organization" element={<OrganizationDashboardPage />} />
              <Route path="/no-organization" element={<NoOrganizationPage />} />
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="/stores/:storeId" element={<StoreSummaryPage />} />
            </Route>

            <Route element={<RoleProtectedRoute allowedRoles={['admin']} />}>
              <Route path="/admin" element={<AdminOrganizationsPage />} />
              <Route path="/admin/organizations" element={<AdminStoresPage />} />
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ToastProvider>
  </ThemeProvider>
);
