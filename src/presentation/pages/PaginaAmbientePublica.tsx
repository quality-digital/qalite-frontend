import { useMemo } from 'react';
import { useParams } from 'react-router-dom';

import type { EnvironmentStatus } from '../../domain/entities/Environment';
import { Layout } from '../components/Layout';
import { TabelaEvidencias } from '../components/environments/TabelaEvidencias';
import { useEnvironmentRealtime } from '../hooks/useEnvironmentRealtime';
import { useTimeTracking } from '../hooks/useTimeTracking';
import { useUserProfiles } from '../hooks/useUserProfiles';

const STATUS_LABEL: Record<EnvironmentStatus, string> = {
  backlog: 'Backlog',
  in_progress: 'Em andamento',
  done: 'Concluído',
};

export const PaginaAmbientePublica = () => {
  const { environmentId } = useParams<{ environmentId: string }>();
  const { environment, isLoading } = useEnvironmentRealtime(environmentId);
  const participants = useUserProfiles(environment?.participants ?? []);
  const { formattedTime } = useTimeTracking(
    environment?.timeTracking ?? null,
    Boolean(environment?.status === 'in_progress'),
  );

  const urls = useMemo(() => environment?.urls ?? [], [environment?.urls]);

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
              {environment.tipoAmbiente} · {environment.tipoTeste}
            </p>
          </div>
        </div>

        <div className="environment-summary-grid">
          <div className="summary-card">
            <h3>Resumo</h3>
            <p>
              <strong>Status:</strong> {STATUS_LABEL[environment.status]}
            </p>
            <p>
              <strong>Tempo total:</strong> {formattedTime}
            </p>
            <p>
              <strong>Jira:</strong> {environment.jiraTask || 'Não informado'}
            </p>
          </div>
          <div className="summary-card">
            <h3>URLs monitoradas</h3>
            {urls.length === 0 ? (
              <p className="section-subtitle">Nenhuma URL adicionada.</p>
            ) : (
              <ul className="environment-url-list">
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
          <h3 className="section-subtitle">Cenários e evidências</h3>
          <TabelaEvidencias environment={environment} isLocked readOnly />
        </div>
      </section>
    </Layout>
  );
};
