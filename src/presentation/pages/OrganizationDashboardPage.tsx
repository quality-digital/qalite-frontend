import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import type { Organization } from '../../domain/entities/organization';
import { organizationService } from '../../application/use-cases/OrganizationUseCase';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../context/ToastContext';
import { useOrganizationBranding } from '../context/OrganizationBrandingContext';
import { Layout } from '../components/Layout';
import { UserAvatar } from '../components/UserAvatar';
import { StoreManagementPanel } from '../components/StoreManagementPanel';
import { OrganizationLogPanel } from '../components/OrganizationLogPanel';

export const OrganizationDashboardPage = () => {
  const navigate = useNavigate();
  const { user, isInitializing } = useAuth();
  const { showToast } = useToast();
  const { setActiveOrganization } = useOrganizationBranding();
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const isAdmin = user?.role?.toLowerCase() === 'admin';

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
    setActiveOrganization(organization ?? null);

    return () => {
      setActiveOrganization(null);
    };
  }, [organization, setActiveOrganization]);

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
              Nenhum membro foi associado a esta organização ainda. Assim que alguém fizer login com
              um e-mail do domínio configurado, ele aparecerá automaticamente aqui.
            </p>
          )}

          {!isLoading && (organization?.members.length ?? 0) > 0 && (
            <ul className="member-list member-list--compact">
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
