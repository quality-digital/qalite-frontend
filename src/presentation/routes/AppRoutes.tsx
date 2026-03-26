import { Suspense, lazy } from 'react';
import { BrowserRouter, Navigate, Outlet, Route, Routes } from 'react-router-dom';

import { ProtectedRoute, RoleProtectedRoute } from './ProtectedRoute';
import { AppProviders, PublicAppProviders } from '../providers/AppProviders';
import { PageLoader } from '../components/PageLoader';
import { RouteSeo } from './RouteSeo';

const HomePage = lazy(() =>
  import('../pages/HomePage').then((module) => ({ default: module.HomePage })),
);
const LoginPage = lazy(() =>
  import('../pages/LoginPage').then((module) => ({ default: module.LoginPage })),
);
const RegisterPage = lazy(() =>
  import('../pages/RegisterPage').then((module) => ({ default: module.RegisterPage })),
);
const ForgotPasswordPage = lazy(() =>
  import('../pages/ForgotPasswordPage').then((module) => ({ default: module.ForgotPasswordPage })),
);
const ResetPasswordPage = lazy(() =>
  import('../pages/ResetPasswordPage').then((module) => ({ default: module.ResetPasswordPage })),
);
const ForbiddenPage = lazy(() =>
  import('../pages/ForbiddenPage').then((module) => ({ default: module.ForbiddenPage })),
);
const PublicEnvironmentPage = lazy(() =>
  import('../pages/PublicEnvironmentPage').then((module) => ({
    default: module.PublicEnvironmentPage,
  })),
);
const UserDashboardPage = lazy(() =>
  import('../pages/UserDashboardPage').then((module) => ({ default: module.UserDashboardPage })),
);
const OrganizationDashboardPage = lazy(() =>
  import('../pages/OrganizationDashboardPage').then((module) => ({
    default: module.OrganizationDashboardPage,
  })),
);
const NoOrganizationPage = lazy(() =>
  import('../pages/NoOrganizationPage').then((module) => ({ default: module.NoOrganizationPage })),
);
const ProfilePage = lazy(() =>
  import('../pages/ProfilePage').then((module) => ({ default: module.ProfilePage })),
);
const StoreSummaryPage = lazy(() =>
  import('../pages/StoreSummaryPage').then((module) => ({ default: module.StoreSummaryPage })),
);
const EnvironmentPage = lazy(() =>
  import('../pages/EnvironmentPage').then((module) => ({ default: module.EnvironmentPage })),
);
const AdminOrganizationsPage = lazy(() =>
  import('../pages/AdminOrganizationsPage').then((module) => ({
    default: module.AdminOrganizationsPage,
  })),
);
const AdminStoresPage = lazy(() =>
  import('../pages/AdminStoresPage').then((module) => ({ default: module.AdminStoresPage })),
);

const AppProvidersOutlet = () => (
  <AppProviders>
    <Outlet />
  </AppProviders>
);

const PublicAppProvidersOutlet = () => (
  <PublicAppProviders>
    <Outlet />
  </PublicAppProviders>
);

export const AppRoutes = () => (
  <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
    <RouteSeo />
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route element={<PublicAppProvidersOutlet />}>
          <Route path="/environments/:environmentId/public" element={<PublicEnvironmentPage />} />
        </Route>

        <Route element={<AppProvidersOutlet />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/403" element={<ForbiddenPage />} />

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
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  </BrowserRouter>
);
