import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import type { Organization } from '../../domain/entities/organization';
import { organizationService } from '../../application/use-cases/OrganizationUseCase';
import type { BrowserstackBuild } from '../../domain/entities/browserstack';
import { browserstackService } from '../../application/use-cases/BrowserstackUseCase';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../context/ToastContext';
import { Layout } from '../components/Layout';
import { UserAvatar } from '../components/UserAvatar';
import { StoreManagementPanel } from '../components/StoreManagementPanel';
import { OrganizationLogPanel } from '../components/OrganizationLogPanel';
import { BrowserstackKanban } from '../components/browserstack/BrowserstackKanban';

export const OrganizationDashboardPage = () => {
  const navigate = useNavigate();
  const { user, isInitializing } = useAuth();
  const { showToast } = useToast();
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [browserstackBuilds, setBrowserstackBuilds] = useState<BrowserstackBuild[]>([]);
  const [isLoadingBrowserstack, setIsLoadingBrowserstack] = useState(false);
  const isAdmin = user?.role?.toLowerCase() === 'admin';

  const loadBrowserstackBuilds = useCallback(async () => {
    if (!organization?.browserstackCredentials) {
      setBrowserstackBuilds([]);
      return;
    }

    try {
      setIsLoadingBrowserstack(true);
      const builds = await browserstackService.listBuilds(organization.browserstackCredentials);
      setBrowserstackBuilds(builds);
    } catch (error) {
      console.error(error);
      setBrowserstackBuilds([]);
      const message =
        error instanceof Error
          ? error.message
          : 'Não foi possível carregar as execuções do BrowserStack.';
      showToast({ type: 'error', message });
    } finally {
      setIsLoadingBrowserstack(false);
    }
  }, [organization, showToast]);

  useEffect(() => {
    if (isInitializing) {
      return;
    }

    if (!user) {
      navigate('/login', { replace: true });
      return;
    }

    if (!user.organizationId) {
      navigate('/no-organization', { replace: true });
      return;
    }

    const fetchOrganization = async () => {
      try {
        setIsLoading(true);
        const data = await organizationService.getById(user.organizationId as string);

        if (!data) {
          showToast({ type: 'error', message: 'Organização não encontrada.' });
          navigate('/no-organization', { replace: true });
          return;
        }

        setOrganization(data);
      } catch (error) {
        console.error(error);
        showToast({ type: 'error', message: 'Não foi possível carregar sua organização.' });
      } finally {
        setIsLoading(false);
      }
    };

    void fetchOrganization();
  }, [isInitializing, navigate, showToast, user]);

  useEffect(() => {
    if (!organization?.browserstackCredentials) {
      setBrowserstackBuilds([]);
      return;
    }

    void loadBrowserstackBuilds();
  }, [loadBrowserstackBuilds, organization]);

  const hasBrowserstackCredentials = Boolean(
    organization?.browserstackCredentials?.username &&
      organization?.browserstackCredentials?.password,
  );

  return (
    <Layout>
      <section className="list-grid">
        <div className="card">
          <span className="badge">Minha organização</span>
          {isLoading ? (
            <p className="section-subtitle">Carregando informações...</p>
          ) : (
            <>
              <h1 className="section-title">{organization?.name ?? 'Organização'}</h1>
              <p className="section-subtitle">
                {organization?.description || 'Mantenha o time alinhado e colabore com eficiência.'}
              </p>
            </>
          )}
        </div>

        <div className="card">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <h2 className="text-xl font-semibold text-primary">Membros</h2>
            {!isLoading && (
              <span className="badge">
                {organization?.members.length ?? 0} membro
                {(organization?.members.length ?? 0) === 1 ? '' : 's'}
              </span>
            )}
          </div>

          {isLoading && <p className="section-subtitle">Sincronizando com o Firestore...</p>}

          {!isLoading && (organization?.members.length ?? 0) === 0 && (
            <p className="section-subtitle">
              Nenhum membro foi associado a esta organização ainda. Aguarde um administrador
              adicionar seu time.
            </p>
          )}

          {!isLoading && (organization?.members.length ?? 0) > 0 && (
            <ul className="member-list">
              {organization?.members.map((member) => (
                <li key={member.uid} className="member-list-item">
                  <UserAvatar
                    name={member.displayName || member.email}
                    photoURL={member.photoURL ?? undefined}
                  />
                  <div className="member-list-details">
                    <span className="member-list-name">{member.displayName || member.email}</span>
                    <span className="member-list-email">{member.email}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {!isLoading && organization && hasBrowserstackCredentials && (
        <BrowserstackKanban
          builds={browserstackBuilds}
          isLoading={isLoadingBrowserstack}
          onRefresh={loadBrowserstackBuilds}
        />
      )}

      {!isLoading && organization && !hasBrowserstackCredentials && (
        <div className="card">
          <span className="badge">BrowserStack</span>
          <h2 className="section-title">Conecte sua conta</h2>
          <p className="section-subtitle">
            Adicione usuário e senha do BrowserStack nas configurações da organização para
            acompanhar as execuções automatizadas.
          </p>
        </div>
      )}

      {!isLoading && organization && isAdmin && (
        <OrganizationLogPanel organizationId={organization.id} />
      )}

      {!isLoading && organization && (
        <StoreManagementPanel
          organizationId={organization.id}
          organizationName={organization.name}
          canManageStores={isAdmin}
          canManageScenarios={Boolean(user)}
        />
      )}
    </Layout>
  );
};
