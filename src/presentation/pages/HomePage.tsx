import { Navigate } from 'react-router-dom';

import { useAuth } from '../hooks/useAuth';
import { PageLoader } from '../components/PageLoader';

export const HomePage = () => {
  const { user, hasRole, isInitializing } = useAuth();

  if (isInitializing) {
    return <PageLoader message="Carregando acesso..." />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (hasRole(['admin'])) {
    return <Navigate to="/admin" replace />;
  }

  return <Navigate to="/dashboard" replace />;
};
