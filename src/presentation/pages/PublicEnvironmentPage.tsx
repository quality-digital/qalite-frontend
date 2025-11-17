import { useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';

import {
  getScenarioPlatformStatuses,
  SCENARIO_COMPLETED_STATUSES,
} from '../../domain/entities/Environment';
import type {
  EnvironmentScenarioPlatform,
  EnvironmentStatus,
} from '../../domain/entities/Environment';
import { Layout } from '../components/Layout';
import { EnvironmentEvidenceTable } from '../components/environments/EnvironmentEvidenceTable';
import { useEnvironmentRealtime } from '../hooks/useEnvironmentRealtime';
import { useTimeTracking } from '../hooks/useTimeTracking';
import { useUserProfiles } from '../hooks/useUserProfiles';
import { useStoreOrganizationBranding } from '../hooks/useStoreOrganizationBranding';
import { useOrganizationBranding } from '../context/OrganizationBrandingContext';

const STATUS_LABEL: Record<EnvironmentStatus, string> = {
  backlog: 'Backlog',
  in_progress: 'Em andamento',
  done: 'Concluído',
};

const PLATFORM_LABEL: Record<EnvironmentScenarioPlatform, string> = {
  mobile: 'Mobile',
  desktop: 'Desktop',
};

export const PublicEnvironmentPage = () => {
  const { environmentId } = useParams<{ environmentId: string }>();
  const { environment, isLoading } = useEnvironmentRealtime(environmentId);
  const participants = useUserProfiles(environment?.participants ?? []);
  const { organization: environmentOrganization } = useStoreOrganizationBranding(
    environment?.storeId ?? null,
  );
  const { setActiveOrganization } = useOrganizationBranding();
  const { formattedTime } = useTimeTracking(
    environment?.timeTracking ?? null,
    Boolean(environment?.status === 'in_progress'),
  );

  const urls = useMemo(() => environment?.urls ?? [], [environment?.urls]);
  const suiteDescription = environment?.suiteName ?? 'Suíte não informada';
  const platformScenarioStats = useMemo(() => {
    const base = {
      mobile: { total: 0, concluded: 0, pending: 0, running: 0 },
      desktop: { total: 0, concluded: 0, pending: 0, running: 0 },
    } satisfies Record<
      EnvironmentScenarioPlatform,
      {
        total: number;
        concluded: number;
        pending: number;
        running: number;
      }
    >;

    if (!environment) {
      return base;
    }

    Object.values(environment.scenarios ?? {}).forEach((scenario) => {
      const statuses = getScenarioPlatformStatuses(scenario);
      (['mobile', 'desktop'] as EnvironmentScenarioPlatform[]).forEach((platform) => {
        base[platform].total += 1;
        const status = statuses[platform];

        if (SCENARIO_COMPLETED_STATUSES.includes(status)) {
          base[platform].concluded += 1;
          return;
        }

        if (status === 'em_andamento') {
          base[platform].running += 1;
          return;
        }

        base[platform].pending += 1;
      });
    });

    return base;
  }, [environment]);

  const combinedScenarioStats = useMemo(
    () => ({
      total: platformScenarioStats.mobile.total + platformScenarioStats.desktop.total,
      concluded: platformScenarioStats.mobile.concluded + platformScenarioStats.desktop.concluded,
      pending: platformScenarioStats.mobile.pending + platformScenarioStats.desktop.pending,
      running: platformScenarioStats.mobile.running + platformScenarioStats.desktop.running,
    }),
    [platformScenarioStats],
  );

  const scenarioCount = platformScenarioStats.mobile.total;

  const progressPercentage = useMemo(() => {
    if (combinedScenarioStats.total === 0) {
      return 0;
    }

    return Math.round((combinedScenarioStats.concluded / combinedScenarioStats.total) * 100);
  }, [combinedScenarioStats.concluded, combinedScenarioStats.total]);

  const progressLabel =
    combinedScenarioStats.total === 0
      ? 'Nenhum cenário cadastrado ainda.'
      : `${combinedScenarioStats.concluded} de ${combinedScenarioStats.total} concluídos`;

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
          <p className="section-subtitle">Carregando ambiente público...</p>
        </section>
      </Layout>
    );
  }

  if (!environment) {
    return (
      <Layout>
        <section className="page-container">
          <h1 className="section-title">Ambiente não encontrado</h1>
          <p className="section-subtitle">Verifique o link compartilhado e tente novamente.</p>
        </section>
      </Layout>
    );
  }

  const headerMeta: string[] = [];
  if (environment.momento) {
    headerMeta.push(`Momento: ${environment.momento}`);
  }
  if (environment.release) {
    headerMeta.push(`Release: ${environment.release}`);
  }

  return (
    <Layout>
      <section className="page-container environment-page environment-page--public">
        <div className="environment-page__header">
          <div>
            <span className={`status-pill status-pill--${environment.status}`}>
              {STATUS_LABEL[environment.status]}
            </span>
            <h1 className="section-title">{environment.identificador}</h1>
            <p className="section-subtitle">
              {environment.tipoAmbiente} · {environment.tipoTeste} · {suiteDescription}
            </p>
            {headerMeta.length > 0 && <p className="section-subtitle">{headerMeta.join(' · ')}</p>}
          </div>
        </div>

        <div className="environment-summary-grid">
          <div className="summary-card summary-card--environment">
            <h3>Resumo do ambiente</h3>
            <div className="summary-card__highlight" aria-live="polite">
              <div>
                <span className="summary-card__highlight-label">Progresso geral</span>
                <strong>{progressPercentage}%</strong>
                <p>{progressLabel}</p>
              </div>
              <div className="summary-card__progress" aria-hidden>
                <span style={{ width: `${progressPercentage}%` }} />
              </div>
            </div>
            <div className="summary-card__section">
              <span className="summary-card__label">Status por plataforma</span>
              <div className="summary-card__platform-grid">
                {(['mobile', 'desktop'] as EnvironmentScenarioPlatform[]).map((platform) => {
                  const stats = platformScenarioStats[platform];
                  return (
                    <div key={platform} className="summary-card__platform-column">
                      <span className="summary-card__platform-title">
                        {PLATFORM_LABEL[platform]}
                      </span>
                      <div className="summary-card__metrics summary-card__metrics--pill">
                        <div className="summary-pill">
                          <span>Total</span>
                          <strong>{stats.total}</strong>
                        </div>
                        <div className="summary-pill">
                          <span>Concluídos</span>
                          <strong>{stats.concluded}</strong>
                        </div>
                        <div className="summary-pill">
                          <span>Em andamento</span>
                          <strong>{stats.running}</strong>
                        </div>
                        <div className="summary-pill">
                          <span>Pendentes</span>
                          <strong>{stats.pending}</strong>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            <p className="summary-card__footnote">
              {scenarioCount === 0
                ? 'Nenhum cenário carregado a partir da suíte selecionada.'
                : `${scenarioCount} cenário${scenarioCount !== 1 ? 's' : ''} executados em Mobile e Desktop.`}
            </p>
            <div className="summary-card__details">
              <div className="summary-card__detail">
                <span className="summary-card__detail-label">Status</span>
                <strong className="summary-card__detail-value">
                  {STATUS_LABEL[environment.status]}
                </strong>
              </div>
              <div className="summary-card__detail">
                <span className="summary-card__detail-label">Tempo total</span>
                <strong className="summary-card__detail-value">{formattedTime}</strong>
              </div>
              <div className="summary-card__detail">
                <span className="summary-card__detail-label">Jira</span>
                <strong className="summary-card__detail-value">
                  {environment.jiraTask || 'Não informado'}
                </strong>
              </div>
              {environment.momento && (
                <div className="summary-card__detail">
                  <span className="summary-card__detail-label">Momento</span>
                  <strong className="summary-card__detail-value">{environment.momento}</strong>
                </div>
              )}
              {environment.release && (
                <div className="summary-card__detail">
                  <span className="summary-card__detail-label">Release</span>
                  <strong className="summary-card__detail-value">{environment.release}</strong>
                </div>
              )}
              <div className="summary-card__detail">
                <span className="summary-card__detail-label">Suíte</span>
                <strong className="summary-card__detail-value">
                  {suiteDescription}
                  {scenarioCount > 0 && (
                    <span className="summary-card__detail-hint">
                      {scenarioCount} cenário{scenarioCount > 1 ? 's' : ''}
                    </span>
                  )}
                </strong>
              </div>
            </div>
            <div className="summary-card__section">
              <span className="summary-card__label">URLs monitoradas</span>
              {urls.length === 0 ? (
                <p className="summary-card__empty">Nenhuma URL adicionada.</p>
              ) : (
                <ul className="environment-url-list summary-card__urls-list">
                  {urls.map((url) => (
                    <li key={url}>
                      <a href={url} target="_blank" rel="noreferrer">
                        {url}
                      </a>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
          <div className="summary-card">
            <h3>Participantes</h3>
            {participants.length === 0 ? (
              <p className="section-subtitle">Nenhum participante registrado.</p>
            ) : (
              <ul className="environment-present-users">
                {participants.map((participant) => {
                  const readableName = participant.displayName || participant.email || 'Usuário';
                  return (
                    <li key={participant.id}>
                      {participant.photoURL ? (
                        <img src={participant.photoURL} alt={readableName} />
                      ) : (
                        <span className="environment-card-avatar environment-card-avatar--initials">
                          {readableName.charAt(0).toUpperCase()}
                        </span>
                      )}
                      <span>{readableName}</span>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>

        <div className="environment-evidence">
          <div className="environment-evidence__header">
            <h3 className="section-title">Cenários e evidências</h3>
          </div>
          <EnvironmentEvidenceTable environment={environment} isLocked readOnly />
        </div>
      </section>
    </Layout>
  );
};
