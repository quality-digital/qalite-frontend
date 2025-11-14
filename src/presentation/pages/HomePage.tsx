import { Navigate } from 'react-router-dom';

import { useAuth } from '../../application/hooks/useAuth';

export const HomePage = () => {
  const { user, hasRole, isInitializing } = useAuth();

  if (isInitializing) {
    return <div className="route-loading">Carregando acesso...</div>;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (hasRole(['admin'])) {
    return <Navigate to="/admin" replace />;
  }

  return <Navigate to="/dashboard" replace />;
};
