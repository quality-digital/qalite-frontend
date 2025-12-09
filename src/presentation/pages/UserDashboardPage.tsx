import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { useAuth } from '../hooks/useAuth';
import { Layout } from '../components/Layout';
import { Button } from '../components/Button';
import { EmptyState } from '../components/EmptyState';
import { useOrganizationStores } from '../hooks/useOrganizationStores';
import { UserAvatar } from '../components/UserAvatar';
import { SimpleBarChart } from '../components/SimpleBarChart';
import { BrowserstackKanban } from '../components/browserstack/BrowserstackKanban';
import { BarChartIcon, SparklesIcon, StorefrontIcon, UsersGroupIcon } from '../components/icons';
import { useToast } from '../context/ToastContext';
import { useOrganizationBranding } from '../context/OrganizationBrandingContext';
import { storeService } from '../../application/use-cases/StoreUseCase';
import { browserstackService } from '../../application/use-cases/BrowserstackUseCase';
import type { BrowserstackBuild } from '../../domain/entities/browserstack';
import { isAutomatedScenario } from '../../shared/utils/automation';
import { useTranslation } from 'react-i18next';

export const UserDashboardPage = () => {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { user, isInitializing } = useAuth();
  const organizationId = user?.organizationId ?? null;
  const { organization, stores, isLoading, status } = useOrganizationStores(organizationId);
  const { setActiveOrganization } = useOrganizationBranding();
  const [storeAutomationCounts, setStoreAutomationCounts] = useState<Record<string, number>>({});
  const [isLoadingAutomationStats, setIsLoadingAutomationStats] = useState(false);
  const [browserstackBuilds, setBrowserstackBuilds] = useState<BrowserstackBuild[]>([]);
  const [isLoadingBrowserstack, setIsLoadingBrowserstack] = useState(false);

  const { t } = useTranslation();

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
  }, [isInitializing, navigate, user]);

  useEffect(() => {
    setActiveOrganization(organization ?? null);

    return () => {
      setActiveOrganization(null);
    };
  }, [organization, setActiveOrganization]);

  useEffect(() => {
    if (stores.length === 0) {
      setStoreAutomationCounts({});
      return;
    }

    let isMounted = true;

    const fetchAutomationStats = async () => {
      setIsLoadingAutomationStats(true);
      try {
        const stats = await Promise.all(
          stores.map(async (store) => {
            const scenarios = await storeService.listScenarios(store.id);
            const automatedCount = scenarios.filter((scenario) =>
              isAutomatedScenario(scenario.automation),
            ).length;

            return [store.id, automatedCount] as const;
          }),
        );

        if (isMounted) {
          setStoreAutomationCounts(Object.fromEntries(stats));
        }
      } catch (error) {
        console.error(error);
        if (isMounted) {
          setStoreAutomationCounts({});
        }
      } finally {
        if (isMounted) {
          setIsLoadingAutomationStats(false);
        }
      }
    };

    void fetchAutomationStats();

    return () => {
      isMounted = false;
    };
  }, [stores]);

  const handleSelectStore = (storeId: string) => {
    navigate(`/stores/${storeId}`);
  };

  const subtitle = useMemo(() => {
    if (organization?.name) {
      return t("userPage.organizationName", { org: organization.name }), t("selectStore");
    }

    if (status === 'error') {
      return t("userPage.loadingError");
    }

    return t("userPage.chooseStore");
  }, [organization?.name, status]);

  const isError = status === 'error';
  const emptyStateTitle = isError
    ? t("userPage.loadingStores")
    : t("userPage.unavailableStores");
  const emptyStateDescription = isError
    ? t("userPage.updatePage")
    : t("userPage.addStores");

  const scenariosPerStoreData = useMemo(
    () =>
      stores.map((store) => ({
        label: store.name,
        value: store.scenarioCount,
      })),
    [stores],
  );

  const automatedScenariosPerStoreData = useMemo(
    () =>
      stores.map((store) => ({
        label: store.name,
        value: storeAutomationCounts[store.id] ?? 0,
      })),
    [stores, storeAutomationCounts],
  );

  const hasBrowserstackCredentials = useMemo(
    () =>
      Boolean(user?.browserstackCredentials?.username && user?.browserstackCredentials?.accessKey),
    [user?.browserstackCredentials?.accessKey, user?.browserstackCredentials?.username],
  );

  const loadBrowserstackBuilds = useCallback(async () => {
    if (!hasBrowserstackCredentials || !user?.browserstackCredentials) {
      setBrowserstackBuilds([]);
      return;
    }

    try {
      setIsLoadingBrowserstack(true);
      const builds = await browserstackService.listBuilds(user.browserstackCredentials);
      setBrowserstackBuilds(builds);
    } catch (error) {
      console.error(error);
      const message =
        error instanceof Error
          ? error.message
          : t("userPage.errorBrowserstack");
      showToast({ type: 'error', message });
    } finally {
      setIsLoadingBrowserstack(false);
    }
  }, [hasBrowserstackCredentials, showToast, user?.browserstackCredentials]);

  useEffect(() => {
    void loadBrowserstackBuilds();
  }, [loadBrowserstackBuilds]);

  return (
    <Layout>
      <section className="page-container">
        <div className="page-header">
          <div>
            <span className="badge">{t("userPage.badge")}</span>
            <h1 className="section-title">{t("userPage.storeTitle")}</h1>
            <p className="section-subtitle">{subtitle}</p>
          </div>
        </div>

        {isLoading ? (
          <p className="section-subtitle">{t("userPage.loadingTitle")}</p>
        ) : stores.length === 0 ? (
          <EmptyState
            title={emptyStateTitle}
            description={emptyStateDescription}
            action={
              isError ? (
                <Button type="button" variant="secondary" onClick={() => window.location.reload()}>
                  {t("userPage.reload")}
                </Button>
              ) : (
                <Button type="button" variant="secondary" onClick={() => navigate('/profile')}>
                  {t("userPage.profile")}
                </Button>
              )
            }
          />
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
                  <div className="card-title-group">
                    <span className="card-title-icon" aria-hidden>
                      <StorefrontIcon className="icon icon--lg" />
                    </span>
                    <h2 className="card-title">{store.name}</h2>
                  </div>
                  <span className="badge">{store.scenarioCount} cenários</span>
                </div>
              </button>
            ))}
          </div>
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
                      <h3>{t("userPage.users")}</h3>
                      <p className="section-subtitle">
                        {t("userPage.userSubtitle")}
                      </p>
                    </div>
                  </div>
                  <span className="badge">
                    {organization.members.length} {t("userPage.usersCount")}
                    {organization.members.length === 1 ? t("userPage.oneUser") : t("userPage.moreUsers")}
                  </span>
                </div>
                {organization.members.length === 0 ? (
                  <p className="section-subtitle">
                    {t("userPage.members")}
                  </p>
                ) : (
                  <ul className="collaborator-list">
                    {organization.members.map((member) => (
                      <li key={member.uid} className="collaborator-card">
                        <UserAvatar
                          name={member.displayName || member.email}
                          photoURL={member.photoURL ?? undefined}
                          size="sm"
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

            <section className="organization-charts-grid">
              <SimpleBarChart
                title={t("userPage.storeScenarios")}
                description={t("userPage.totalScenarios")}
                data={scenariosPerStoreData}
                emptyMessage={t("userPage.emptyStores")}
                icon={<BarChartIcon aria-hidden className="icon icon--lg" />}
              />
              <SimpleBarChart
                title={t("userPage.automatedScenarios")}
                description={t("userPage.scenariosDescription")}
                data={automatedScenariosPerStoreData}
                emptyMessage={t("userPage.emptyScenarios")}
                isLoading={isLoadingAutomationStats}
                variant="info"
                icon={<SparklesIcon aria-hidden className="icon icon--lg" />}
              />
            </section>
          </div>
        )}
      </section>

      {organization && (
        <section className="page-container">
          {hasBrowserstackCredentials ? (
            <BrowserstackKanban
              builds={browserstackBuilds}
              isLoading={isLoadingBrowserstack}
              onRefresh={loadBrowserstackBuilds}
            />
          ) : (
            <div className="card">
              <span className="badge">BrowserStack</span>
              <h2 className="section-title">{t("userPage.browserstackTitle")}</h2>
              <p className="section-subtitle">
                {t("userPage.browserstackSubtitle")}
              </p>
            </div>
          )}
        </section>
      )}
    </Layout>
  );
};
