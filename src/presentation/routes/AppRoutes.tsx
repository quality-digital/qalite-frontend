import { Suspense, lazy } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';

import { ProtectedRoute, RoleProtectedRoute } from './ProtectedRoute';
import { AppProviders } from '../providers/AppProviders';
import { PageLoader } from '../components/PageLoader';

const HomePage = lazy(() =>
  import('../pages/HomePage').then(({ HomePage }) => ({ default: HomePage })),
);
const LoginPage = lazy(() =>
  import('../pages/LoginPage').then(({ LoginPage }) => ({ default: LoginPage })),
);
const RegisterPage = lazy(() =>
  import('../pages/RegisterPage').then(({ RegisterPage }) => ({ default: RegisterPage })),
);
const ForgotPasswordPage = lazy(() =>
  import('../pages/ForgotPasswordPage').then(({ ForgotPasswordPage }) => ({
    default: ForgotPasswordPage,
  })),
);
const ForbiddenPage = lazy(() =>
  import('../pages/ForbiddenPage').then(({ ForbiddenPage }) => ({ default: ForbiddenPage })),
);
const PublicEnvironmentPage = lazy(() =>
  import('../pages/PublicEnvironmentPage').then(({ PublicEnvironmentPage }) => ({
    default: PublicEnvironmentPage,
  })),
);
const UserDashboardPage = lazy(() =>
  import('../pages/UserDashboardPage').then(({ UserDashboardPage }) => ({
    default: UserDashboardPage,
  })),
);
const OrganizationDashboardPage = lazy(() =>
  import('../pages/OrganizationDashboardPage').then(({ OrganizationDashboardPage }) => ({
    default: OrganizationDashboardPage,
  })),
);
const NoOrganizationPage = lazy(() =>
  import('../pages/NoOrganizationPage').then(({ NoOrganizationPage }) => ({
    default: NoOrganizationPage,
  })),
);
const ProfilePage = lazy(() =>
  import('../pages/ProfilePage').then(({ ProfilePage }) => ({ default: ProfilePage })),
);
const StoreSummaryPage = lazy(() =>
  import('../pages/StoreSummaryPage').then(({ StoreSummaryPage }) => ({
    default: StoreSummaryPage,
  })),
);
const EnvironmentPage = lazy(() =>
  import('../pages/EnvironmentPage').then(({ EnvironmentPage }) => ({ default: EnvironmentPage })),
);
const AdminOrganizationsPage = lazy(() =>
  import('../pages/AdminOrganizationsPage').then(({ AdminOrganizationsPage }) => ({
    default: AdminOrganizationsPage,
  })),
);
const AdminStoresPage = lazy(() =>
  import('../pages/AdminStoresPage').then(({ AdminStoresPage }) => ({ default: AdminStoresPage })),
);

export const AppRoutes = () => (
  <AppProviders>
    <BrowserRouter>
      <Suspense fallback={<PageLoader message="Carregando conteúdo..." />}>
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
      </Suspense>
    </BrowserRouter>
  </AppProviders>
);
