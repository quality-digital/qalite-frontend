import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import type { Organization } from '../../domain/entities/Organization';
import type { Store } from '../../domain/entities/Store';
import { useAuth } from '../hooks/useAuth';
import { organizationService } from '../../main/factories/organizationServiceFactory';
import { storeService } from '../../main/factories/storeServiceFactory';
import { useToast } from '../context/ToastContext';
import { Layout } from '../components/Layout';

export const UserDashboardPage = () => {
  const navigate = useNavigate();
  const { user, isInitializing } = useAuth();
  const { showToast } = useToast();
  const [stores, setStores] = useState<Store[]>([]);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [isLoading, setIsLoading] = useState(true);

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

    if (!user.organizationId) {
      navigate('/no-organization', { replace: true });
      return;
    }

    const fetchStores = async () => {
      try {
        setIsLoading(true);
        const [organizationData, storesData] = await Promise.all([
          organizationService.getById(user.organizationId as string),
          storeService.listByOrganization(user.organizationId as string),
        ]);

        if (organizationData) {
          setOrganization(organizationData);
        }

        setStores(storesData);
      } catch (error) {
        console.error(error);
        showToast({ type: 'error', message: 'Não foi possível carregar as lojas disponíveis.' });
      } finally {
        setIsLoading(false);
      }
    };

    void fetchStores();
  }, [isInitializing, navigate, showToast, user]);

  const handleSelectStore = (storeId: string) => {
    navigate(`/stores/${storeId}`);
  };

  return (
    <Layout>
      <section className="page-container">
        <div className="page-header">
          <div>
            <span className="badge">Minhas lojas</span>
            <h1 className="section-title">Escolha uma loja para visualizar a massa de cenários</h1>
            <p className="section-subtitle">
              {organization?.name
                ? `Você está vinculado à organização ${organization.name}.`
                : 'Visualize as lojas disponíveis para começar a explorar os cenários.'}
            </p>
          </div>
        </div>

        {isLoading ? (
          <p className="section-subtitle">Carregando lojas disponíveis...</p>
        ) : stores.length === 0 ? (
          <div className="dashboard-empty">
            <h2 className="text-xl font-semibold text-primary">Nenhuma loja disponível</h2>
            <p className="section-subtitle">
              Aguarde até que um administrador cadastre lojas para sua organização ou atualize a
              página mais tarde.
            </p>
          </div>
        ) : (
          <div className="dashboard-grid">
            {stores.map((store) => (
              <button
                key={store.id}
                type="button"
                className="card card-interactive"
                onClick={() => handleSelectStore(store.id)}
              >
                <div className="card-header">
                  <h2 className="card-title">{store.name}</h2>
                  <span className="badge">{store.scenarioCount} cenários</span>
                </div>
                <div className="card-description">
                  <p>
                    <strong>Site:</strong> {store.site || 'Não informado'}
                  </p>
                </div>
              </button>
            ))}
          </div>
        )}
      </section>
    </Layout>
  );
};
