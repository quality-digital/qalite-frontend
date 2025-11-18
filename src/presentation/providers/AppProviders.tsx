import type { ReactNode } from 'react';

import { AuthProvider } from '../context/AuthContext';
import { OrganizationBrandingProvider } from '../context/OrganizationBrandingContext';
import { ThemeProvider } from '../context/ThemeContext';
import { ToastProvider } from '../context/ToastContext';

export const AppProviders = ({ children }: { children: ReactNode }) => (
  <ThemeProvider>
    <ToastProvider>
      <AuthProvider>
        <OrganizationBrandingProvider>{children}</OrganizationBrandingProvider>
      </AuthProvider>
    </ToastProvider>
  </ThemeProvider>
);
