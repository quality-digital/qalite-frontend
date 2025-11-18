import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';

import { ProtectedRoute, RoleProtectedRoute } from './ProtectedRoute';
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
import { PublicEnvironmentPage } from '../pages/PublicEnvironmentPage';
import { AppProviders } from '../providers/AppProviders';

export const AppRoutes = () => (
  <AppProviders>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/403" element={<ForbiddenPage />} />
        <Route path="/environments/:environmentId/public" element={<PublicEnvironmentPage />} />

        <Route element={<ProtectedRoute />}>
          <Route path="/dashboard" element={<UserDashboardPage />} />
          <Route path="/organization" element={<OrganizationDashboardPage />} />
          <Route path="/no-organization" element={<NoOrganizationPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/stores/:storeId" element={<StoreSummaryPage />} />
          <Route path="/environments/:environmentId" element={<EnvironmentPage />} />
        </Route>

        <Route element={<RoleProtectedRoute allowedRoles={['admin']} />}>
          <Route path="/admin" element={<AdminOrganizationsPage />} />
          <Route path="/admin/organizations" element={<AdminStoresPage />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  </AppProviders>
);
