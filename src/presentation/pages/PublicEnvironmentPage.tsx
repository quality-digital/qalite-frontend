import { useMemo } from 'react';
import { useParams } from 'react-router-dom';

import type { EnvironmentStatus } from '../../domain/entities/Environment';
import { Layout } from '../components/Layout';
import { EnvironmentEvidenceTable } from '../components/environments/EnvironmentEvidenceTable';
import { useEnvironmentRealtime } from '../hooks/useEnvironmentRealtime';
import { useTimeTracking } from '../hooks/useTimeTracking';
import { useUserProfiles } from '../hooks/useUserProfiles';

const STATUS_LABEL: Record<EnvironmentStatus, string> = {
  backlog: 'Backlog',
  in_progress: 'Em andamento',
  done: 'Concluído',
};

export const PublicEnvironmentPage = () => {
  const { environmentId } = useParams<{ environmentId: string }>();
  const { environment, isLoading } = useEnvironmentRealtime(environmentId);
  const participants = useUserProfiles(environment?.participants ?? []);
  const { formattedTime } = useTimeTracking(
    environment?.timeTracking ?? null,
    Boolean(environment?.status === 'in_progress'),
  );

  const urls = useMemo(() => environment?.urls ?? [], [environment?.urls]);
  const suiteDescription = environment?.suiteName ?? 'Suíte não informada';
  const scenarioStats = useMemo(() => {
    if (!environment) {
      return { total: 0, concluded: 0, pending: 0, running: 0 };
    }

    const scenarios = Object.values(environment.scenarios ?? {});
    const concluded = scenarios.filter((scenario) =>
      ['concluido', 'concluido_automatizado', 'nao_se_aplica'].includes(scenario.status),
    ).length;
    const pending = scenarios.filter((scenario) => scenario.status === 'pendente').length;
    const running = scenarios.filter((scenario) => scenario.status === 'em_andamento').length;
    return { total: scenarios.length, concluded, pending, running };
  }, [environment]);

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

  return (
    <Layout>
      <section className="page-container environment-page environment-page--public">
        <div className="environment-page__header">
          <div className="environment-page__title">
            <span className={`status-pill status-pill--${environment.status}`}>
              {STATUS_LABEL[environment.status]}
            </span>
            <h1 className="section-title">{environment.identificador}</h1>
            <p className="section-subtitle">
              {environment.tipoAmbiente} · {environment.tipoTeste} · {suiteDescription}
            </p>
          </div>
        </div>

        <div className="environment-summary-grid">
          <div className="summary-card summary-card--environment">
            <h3>Resumo do ambiente</h3>
            <div className="summary-card__metrics">
              <div>
                <span>Total de cenários</span>
                <strong>{scenarioStats.total}</strong>
              </div>
              <div>
                <span>Concluídos</span>
                <strong>{scenarioStats.concluded}</strong>
              </div>
              <div>
                <span>Em andamento</span>
                <strong>{scenarioStats.running}</strong>
              </div>
              <div>
                <span>Pendentes</span>
                <strong>{scenarioStats.pending}</strong>
              </div>
            </div>
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
              <div className="summary-card__detail">
                <span className="summary-card__detail-label">Suíte</span>
                <strong className="summary-card__detail-value">{suiteDescription}</strong>
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
                {participants.map((participant) => (
                  <li key={participant.id}>
                    {participant.photoURL ? (
                      <img src={participant.photoURL} alt={participant.name} />
                    ) : (
                      <span className="environment-card-avatar environment-card-avatar--initials">
                        {participant.name.charAt(0).toUpperCase()}
                      </span>
                    )}
                    <span>{participant.name}</span>
                  </li>
                ))}
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
