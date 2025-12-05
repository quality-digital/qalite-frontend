import { Navigate } from 'react-router-dom';

import { useAuth } from '../hooks/useAuth';
import { PageLoader } from '../components/PageLoader';
import { useTranslation } from 'react-i18next';

export const HomePage = () => {
  const { user, hasRole, isInitializing } = useAuth();

  const { t: translation } = useTranslation();

  if (isInitializing) {
    return <PageLoader message={translation('loadingAccess')} />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (hasRole(['admin'])) {
    return <Navigate to="/admin" replace />;
  }

  return <Navigate to="/dashboard" replace />;
};
