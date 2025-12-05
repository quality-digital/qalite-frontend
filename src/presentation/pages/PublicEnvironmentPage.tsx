import { useEffect } from 'react';
import { useParams } from 'react-router-dom';

import { Layout } from '../components/Layout';
import { EnvironmentEvidenceTable } from '../components/environments/EnvironmentEvidenceTable';
import { EnvironmentBugList } from '../components/environments/EnvironmentBugList';
import { EnvironmentSummaryCard } from '../components/environments/EnvironmentSummaryCard';
import { useEnvironmentRealtime } from '../hooks/useEnvironmentRealtime';
import { useTimeTracking } from '../hooks/useTimeTracking';
import { useUserProfiles } from '../hooks/useUserProfiles';
import { useStoreOrganizationBranding } from '../hooks/useStoreOrganizationBranding';
import { useOrganizationBranding } from '../context/OrganizationBrandingContext';
import { useEnvironmentBugs } from '../hooks/useEnvironmentBugs';
import { useEnvironmentDetails } from '../hooks/useEnvironmentDetails';
import { useTranslation } from 'react-i18next';

export const PublicEnvironmentPage = () => {
  const { environmentId } = useParams<{ environmentId: string }>();
  const { environment, isLoading } = useEnvironmentRealtime(environmentId);
  const participants = useUserProfiles(environment?.participants ?? []);
  const { organization: environmentOrganization } = useStoreOrganizationBranding(
    environment?.storeId ?? null,
  );
  const { setActiveOrganization } = useOrganizationBranding();
  const { formattedTime, formattedStart, formattedEnd } = useTimeTracking(
    environment?.timeTracking ?? null,
    Boolean(environment?.status === 'in_progress'),
  );
  const { bugs, isLoading: isLoadingBugs } = useEnvironmentBugs(environment?.id ?? null);
  const { bugCountByScenario, progressPercentage, progressLabel, scenarioCount, headerMeta, urls } =
    useEnvironmentDetails(environment, bugs);

  const { t } = useTranslation();

  useEffect(() => {
    setActiveOrganization(environmentOrganization ?? null);

    return () => {
      setActiveOrganization(null);
    };
  }, [environmentOrganization, setActiveOrganization]);

  if (isLoading) {
    return (
      <Layout>
        <section className="page-container">
          <p className="section-subtitle">{t('publicEnvironment.loading')}</p>
        </section>
      </Layout>
    );
  }

  if (!environment) {
    return (
      <Layout>
        <section className="page-container">
          <h1 className="section-title">{t('publicEnvironment.notFound')}</h1>
          <p className="section-subtitle">{t('publicEnvironment.tryAgain')}</p>
        </section>
      </Layout>
    );
  }

  return (
    <Layout>
      <section className="page-container environment-page environment-page--public">
        <div className="environment-page__header">
          <div>
            <h1 className="section-title">{environment.identificador}</h1>
            <p className="section-subtitle">
              {environment.tipoAmbiente} · {environment.tipoTeste}
            </p>
            {headerMeta.length > 0 && <p className="section-subtitle">{headerMeta.join(' · ')}</p>}
          </div>
        </div>

        <div className="environment-summary-grid">
          <EnvironmentSummaryCard
            environment={environment}
            progressPercentage={progressPercentage}
            progressLabel={progressLabel}
            scenarioCount={scenarioCount}
            formattedTime={formattedTime}
            formattedStart={formattedStart}
            formattedEnd={formattedEnd}
            urls={urls}
            participants={participants}
            bugsCount={bugs.length}
          />
        </div>

        <div className="environment-evidence">
          <div className="environment-evidence__header">
            <h3 className="section-title">{t('publicEnvironment.scenarios')}</h3>
          </div>
          <EnvironmentEvidenceTable
            environment={environment}
            isLocked
            readOnly
            bugCountByScenario={bugCountByScenario}
            organizationId={environmentOrganization?.id ?? null}
          />
        </div>
        <EnvironmentBugList
          environment={environment}
          bugs={bugs}
          isLocked
          isLoading={isLoadingBugs}
          onEdit={() => {}}
          showActions={false}
        />
      </section>
    </Layout>
  );
};
