import { useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';

import { useAuth } from '../hooks/useAuth';
import { Layout } from '../components/Layout';
import { Button } from '../components/Button';
import { EmptyState } from '../components/EmptyState';
import { useOrganizationStores } from '../hooks/useOrganizationStores';
import { UserAvatar } from '../components/UserAvatar';
import { CachedImage } from '../components/CachedImage';
import {
  ActivityIcon,
  InboxIcon,
  PieChartIcon,
  StorefrontIcon,
  TrendIcon,
  UsersGroupIcon,
} from '../components/icons';
import { useOrganizationBranding } from '../context/OrganizationBrandingContext';
import { useTranslation } from 'react-i18next';

export const UserDashboardPage = () => {
  const navigate = useNavigate();
  const { user, isInitializing } = useAuth();
  const organizationId = user?.organizationId ?? null;
  const { organization, stores, isLoading, status } = useOrganizationStores(organizationId);
  const { setActiveOrganization } = useOrganizationBranding();

  const { t } = useTranslation();
  const scenarioChartData = useMemo(() => {
    return stores
      .map((store) => {
        const automated = store.automatedScenarioCount ?? 0;
        const notAutomated =
          store.notAutomatedScenarioCount ?? Math.max(store.scenarioCount - automated, 0);
        const total = store.scenarioCount || automated + notAutomated;

        return {
          label: store.name,
          automated,
          notAutomated,
          total,
        };
      })
      .sort(
        (first, second) => second.total - first.total || first.label.localeCompare(second.label),
      );
  }, [stores]);
  const totalScenarios = scenarioChartData.reduce((acc, item) => acc + item.total, 0);
  const totalAutomated = scenarioChartData.reduce((acc, item) => acc + item.automated, 0);
  const totalManual = scenarioChartData.reduce((acc, item) => acc + item.notAutomated, 0);
  const automationRate =
    totalScenarios > 0 ? Math.round((totalAutomated / totalScenarios) * 100) : 0;

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
  }, [isInitializing, navigate, user]);

  useEffect(() => {
    setActiveOrganization(organization ?? null);

    return () => {
      setActiveOrganization(null);
    };
  }, [organization, setActiveOrganization]);

  const handleSelectStore = (storeId: string) => {
    navigate(`/stores/${storeId}`);
  };

  const subtitle = useMemo(() => {
    if (organization?.name) {
      return (t('userPage.organizationName', { org: organization.name }), t('selectStore'));
    }

    if (status === 'error') {
      return t('userPage.loadingError');
    }

    return t('userPage.chooseStore');
  }, [organization?.name, status, t]);

  const isError = status === 'error';
  const emptyStateTitle = isError ? t('userPage.loadingStores') : t('userPage.unavailableStores');
  const emptyStateDescription = isError ? t('userPage.updatePage') : t('userPage.addStores');

  return (
    <Layout>
      <section className="page-container">
        <div className="page-header">
          <div>
            <span className="badge">{t('userPage.badge')}</span>
            <h1 className="section-title">{t('userPage.storeTitle')}</h1>
            <p className="section-subtitle">{subtitle}</p>
          </div>
        </div>

        {isLoading ? (
          <p className="section-subtitle">{t('userPage.loadingTitle')}</p>
        ) : stores.length === 0 ? (
          <EmptyState
            title={emptyStateTitle}
            description={emptyStateDescription}
            icon={<InboxIcon className="icon icon--lg" aria-hidden />}
            action={
              isError ? (
                <Button type="button" variant="secondary" onClick={() => window.location.reload()}>
                  {t('userPage.reload')}
                </Button>
              ) : (
                <Button type="button" variant="secondary" onClick={() => navigate('/profile')}>
                  {t('userPage.profile')}
                </Button>
              )
            }
          />
        ) : (
          <>
            <section className="dashboard-kpi-grid">
              <article className="dashboard-kpi-card">
                <span className="dashboard-kpi-card__icon">
                  <StorefrontIcon className="icon icon--lg" />
                </span>
                <strong>{stores.length}</strong>
                <span>{t('userPage.kpis.activeStores')}</span>
              </article>
              <article className="dashboard-kpi-card">
                <span className="dashboard-kpi-card__icon">
                  <ActivityIcon className="icon icon--lg" />
                </span>
                <strong>{totalScenarios}</strong>
                <span>{t('userPage.kpis.totalScenarios')}</span>
              </article>
              <article className="dashboard-kpi-card">
                <span className="dashboard-kpi-card__icon">
                  <PieChartIcon className="icon icon--lg" />
                </span>
                <strong>{automationRate}%</strong>
                <span>{t('userPage.kpis.averageAutomation')}</span>
              </article>
              <article className="dashboard-kpi-card">
                <span className="dashboard-kpi-card__icon">
                  <TrendIcon className="icon icon--lg" />
                </span>
                <strong>{totalManual}</strong>
                <span>{t('userPage.kpis.manualCases')}</span>
              </article>
            </section>

            <div className="dashboard-grid">
              {stores.map((store) => (
                <button
                  key={store.id}
                  type="button"
                  className="card card-interactive"
                  onClick={() => handleSelectStore(store.id)}
                >
                  <div className="card-header">
                    <div className="card-title-group">
                      <span className="card-title-icon" aria-hidden>
                        {store.logoUrl ? (
                          <CachedImage src={store.logoUrl} alt="" className="store-card-logo" />
                        ) : (
                          <StorefrontIcon className="icon icon--lg" />
                        )}
                      </span>
                      <div>
                        <h2 className="card-title">{store.name}</h2>
                        <span className="badge store-card-scenarios">
                          {t('AdminStoresPage.store-card-scenarios-badge', {
                            scenarioCount: store.scenarioCount,
                          })}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="card-link-hint">
                    <span>{t('storesPage.openStore')}</span>
                    <span aria-hidden="true">&rarr;</span>
                  </div>
                </button>
              ))}
            </div>
          </>
        )}

        {stores.length > 0 && (
          <div className="organization-extra">
            {organization && (
              <section className="organization-collaborators-card">
                <div className="organization-collaborators-card__header">
                  <div className="section-heading">
                    <span className="section-heading__icon" aria-hidden>
                      <UsersGroupIcon className="icon icon--lg" />
                    </span>
                    <div>
                      <h3>{t('userPage.users')}</h3>
                      <p className="section-subtitle">{t('userPage.userSubtitle')}</p>
                    </div>
                  </div>
                  <span className="badge">
                    {organization.members.length} {t('userPage.usersCount')}
                    {organization.members.length === 1
                      ? t('userPage.oneUser')
                      : t('userPage.moreUsers')}
                  </span>
                </div>
                {organization.members.length === 0 ? (
                  <p className="section-subtitle">{t('userPage.members')}</p>
                ) : (
                  <ul className="collaborator-list">
                    {organization.members.map((member) => (
                      <li key={member.uid} className="collaborator-card">
                        <UserAvatar
                          name={member.displayName || member.email}
                          size="sm"
                          photoUrl={member.photoURL ?? null}
                        />
                        <div className="collaborator-card__details">
                          <strong>{member.displayName || member.email}</strong>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            )}
          </div>
        )}
      </section>
    </Layout>
  );
};
