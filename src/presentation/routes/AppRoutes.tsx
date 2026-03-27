import { Suspense, lazy } from 'react';
import { BrowserRouter, Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom';
import { useEffect } from 'react';

import { ProtectedRoute, RoleProtectedRoute } from './ProtectedRoute';
import { AppProviders, PublicAppProviders } from '../providers/AppProviders';
import { PageLoader } from '../components/PageLoader';

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

const ScrollToTop = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
  }, [pathname]);

  return null;
};

export const AppRoutes = () => (
  <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
    <Suspense fallback={<PageLoader />}>
      <ScrollToTop />
      <Routes>
        <Route element={<PublicAppProvidersOutlet />}>
          <Route path="/environments/public" element={<PublicEnvironmentPage />} />
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
            <Route path="/no-organization" element={<NoOrganizationPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/stores" element={<StoreSummaryPage />} />
            <Route path="/environments" element={<EnvironmentPage />} />
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
