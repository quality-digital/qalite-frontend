import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';

import { AuthProvider } from '../../application/context/AuthContext';
import { ProtectedRoute, RoleProtectedRoute } from '../../application/routes/ProtectedRoute';
import { ThemeProvider } from '../context/ThemeContext';
import { ToastProvider } from '../context/ToastContext';
import { AdminDashboardPage } from '../pages/AdminDashboardPage';
import { ForbiddenPage } from '../pages/ForbiddenPage';
import { ForgotPasswordPage } from '../pages/ForgotPasswordPage';
import { HomePage } from '../pages/HomePage';
import { LoginPage } from '../pages/LoginPage';
import { ProfilePage } from '../pages/ProfilePage';
import { RegisterPage } from '../pages/RegisterPage';
import { UserDashboardPage } from '../pages/UserDashboardPage';

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

          <Route element={<ProtectedRoute />}>
            <Route path="/dashboard" element={<UserDashboardPage />} />
            <Route path="/profile" element={<ProfilePage />} />
          </Route>

          <Route element={<RoleProtectedRoute allowedRoles={['admin']} />}>
            <Route path="/admin" element={<AdminDashboardPage />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ToastProvider>
  </ThemeProvider>
);
