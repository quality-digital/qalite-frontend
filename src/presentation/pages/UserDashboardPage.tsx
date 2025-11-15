import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

import { useAuth } from '../../application/hooks/useAuth';
import { Layout } from '../components/Layout';

export const UserDashboardPage = () => {
  const navigate = useNavigate();
  const { user, isInitializing } = useAuth();

  useEffect(() => {
    if (isInitializing) {
      return;
    }

    if (!user) {
      navigate('/login', { replace: true });
      return;
    }

    if (user.role === 'admin') {
      navigate('/admin', { replace: true });
      return;
    }

    if (user.organizationId) {
      navigate('/organization', { replace: true });
      return;
    }

    navigate('/no-organization', { replace: true });
  }, [isInitializing, navigate, user]);

  return (
    <Layout>
      <div className="route-loading">Carregando sua experiência...</div>
    </Layout>
  );
};
