import type { ReactNode } from 'react';

import { AuthProvider } from '../context/AuthContext';
import { AdminAccessRequestsNotificationsProvider } from '../context/AdminAccessRequestsNotificationsContext';
import { OrganizationBrandingProvider } from '../context/OrganizationBrandingContext';
import { StoresRealtimeProvider } from '../context/StoresRealtimeContext';
import { ThemeProvider } from '../context/ThemeContext';
import { ToastProvider } from '../context/ToastContext';
import { UserPreferencesProvider } from '../context/UserPreferencesContext';

const BaseProviders = ({ children }: { children: ReactNode }) => (
  <ThemeProvider>
    <ToastProvider>
      <AuthProvider>
        <OrganizationBrandingProvider>{children}</OrganizationBrandingProvider>
      </AuthProvider>
    </ToastProvider>
  </ThemeProvider>
);

export const PublicAppProviders = ({ children }: { children: ReactNode }) => (
  <BaseProviders>{children}</BaseProviders>
);

export const AppProviders = ({ children }: { children: ReactNode }) => (
  <BaseProviders>
    <AdminAccessRequestsNotificationsProvider>
      <UserPreferencesProvider>
        <StoresRealtimeProvider>{children}</StoresRealtimeProvider>
      </UserPreferencesProvider>
    </AdminAccessRequestsNotificationsProvider>
  </BaseProviders>
);
