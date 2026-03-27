import { useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';

import { storeService } from '../../infrastructure/services/storeService';
import { Layout } from '../components/Layout';
import { EnvironmentEvidenceTable } from '../components/environments/EnvironmentEvidenceTable';
import { EnvironmentBugList } from '../components/environments/EnvironmentBugList';
import { EnvironmentSummaryCard } from '../components/environments/EnvironmentSummaryCard';
import { useEnvironmentRealtime } from '../hooks/useEnvironmentRealtime';
import { useUserProfiles } from '../hooks/useUserProfiles';
import { useStoreOrganizationBranding } from '../hooks/useStoreOrganizationBranding';
import { useOrganizationBranding } from '../context/OrganizationBrandingContext';
import { useEnvironmentBugs } from '../hooks/useEnvironmentBugs';
import { useEnvironmentDetails } from '../hooks/useEnvironmentDetails';
import { useTranslation } from 'react-i18next';

import { normalizeLanguagePreference } from '../../shared/config/userPreferences';

export const PublicEnvironmentPage = () => {
  const [searchParams] = useSearchParams();
  const environmentId = searchParams.get('id') ?? undefined;
  const sharedStoreName = searchParams.get('storeName') ?? '';
  const sharedStoreLogoUrl = searchParams.get('storeLogoUrl') ?? '';
  const requestedLanguageRef = useRef<string | null>(null);
  const { environment, isLoading } = useEnvironmentRealtime(environmentId);
  const participants = useUserProfiles(environment?.participants ?? []);
  const { organization: environmentOrganization } = useStoreOrganizationBranding(
    environment?.storeId ?? null,
  );
  const { activeStore, setActiveOrganization, setActiveStore } = useOrganizationBranding();
  const { t, i18n } = useTranslation();
  const { bugs, isLoading: isLoadingBugs } = useEnvironmentBugs(environment?.id ?? null);
  const { scenarioCount, urls } = useEnvironmentDetails(environment, bugs);

  useEffect(() => {
    setActiveOrganization(environmentOrganization ?? null);

    return () => {
      setActiveOrganization(null);
      setActiveStore(null);
    };
  }, [environmentOrganization, setActiveOrganization, setActiveStore]);

  useEffect(() => {
    const publicLanguage = normalizeLanguagePreference(environment?.publicShareLanguage);
    const activeLanguage = normalizeLanguagePreference(i18n.resolvedLanguage ?? i18n.language);

    if (!publicLanguage || activeLanguage === publicLanguage) {
      requestedLanguageRef.current = null;
      return;
    }

    if (requestedLanguageRef.current === publicLanguage) {
      return;
    }

    requestedLanguageRef.current = publicLanguage;

    void i18n.changeLanguage(publicLanguage).finally(() => {
      requestedLanguageRef.current = null;
    });
  }, [environment?.publicShareLanguage, i18n.language, i18n.resolvedLanguage, i18n]);

  useEffect(() => {
    if (!environment?.storeId) {
      setActiveStore(null);
      return;
    }

    let isMounted = true;

    const fetchStoreName = async () => {
      try {
        const store = await storeService.getDetail(environment.storeId);
        if (isMounted) {
          setActiveStore(
            store
              ? {
                  id: store.id,
                  name: store.name.trim(),
                  logoUrl: store.logoUrl ?? null,
                }
              : null,
          );
        }
      } catch {
        if (isMounted) {
          setActiveStore(null);
        }
      }
    };

    void fetchStoreName();

    return () => {
      isMounted = false;
    };
  }, [environment?.storeId, setActiveStore]);

  if (isLoading) {
    return (
      <Layout showHeader={false}>
        <section className="page-container">
          <p className="section-subtitle">{t('publicEnvironment.loading')}</p>
        </section>
      </Layout>
    );
  }

  if (!environment) {
    return (
      <Layout showHeader={false}>
        <section className="page-container">
          <h1 className="section-title">{t('publicEnvironment.notFound')}</h1>
          <p className="section-subtitle">{t('publicEnvironment.tryAgain')}</p>
        </section>
      </Layout>
    );
  }

  return (
    <Layout showHeader={false}>
      <section className="page-container environment-page environment-page--public">
        <div className="environment-summary-grid">
          <EnvironmentSummaryCard
            environment={environment}
            scenarioCount={scenarioCount}
            urls={urls}
            participants={participants}
            bugsCount={bugs.length}
            storeName={activeStore?.name ?? sharedStoreName}
            storeLogoUrl={activeStore?.logoUrl ?? (sharedStoreLogoUrl || null)}
            showStoreBranding
          />
        </div>

        <div className="environment-evidence">
          <EnvironmentEvidenceTable environment={environment} isLocked readOnly />
        </div>
        <EnvironmentBugList
          environment={environment}
          bugs={bugs}
          participants={participants}
          isLocked
          isLoading={isLoadingBugs}
          onEdit={() => {}}
          showActions={false}
          showHeader={false}
        />
      </section>
    </Layout>
  );
};
