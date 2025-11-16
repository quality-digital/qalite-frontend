import { useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import type { EnvironmentStatus } from '../../domain/entities/Environment';
import { updateEnvironment } from '../../infra/firebase/environmentService';
import { Layout } from '../components/Layout';
import { Button } from '../components/Button';
import { useToast } from '../context/ToastContext';
import { useEnvironmentRealtime } from '../hooks/useEnvironmentRealtime';
import { usePresentUsers } from '../hooks/usePresentUsers';
import { useTimeTracking } from '../hooks/useTimeTracking';
import { TabelaEvidencias } from '../components/environments/TabelaEvidencias';

const STATUS_LABEL: Record<EnvironmentStatus, string> = {
  backlog: 'Backlog',
  in_progress: 'Em andamento',
  done: 'Concluído',
};

export const PaginaAmbiente = () => {
  const { environmentId } = useParams<{ environmentId: string }>();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { environment, isLoading } = useEnvironmentRealtime(environmentId);
  const isLocked = environment?.status === 'done';

  const { presentUsers } = usePresentUsers({
    environmentId: environment?.id ?? null,
    presentUsersIds: environment?.presentUsersIds ?? [],
    isLocked: Boolean(isLocked),
  });

  const { formattedTime } = useTimeTracking(
    environment?.timeTracking ?? null,
    environment?.status === 'in_progress',
  );

  const urls = useMemo(() => environment?.urls ?? [], [environment?.urls]);

  const handleStatusTransition = async (target: EnvironmentStatus) => {
    if (!environment) {
      return;
    }

    if (target === 'done') {
      const hasPending = Object.values(environment.scenarios ?? {}).some(
        (scenario) => scenario.status !== 'concluido',
      );

      if (hasPending) {
        showToast({
          type: 'error',
          message: 'Existem cenários pendentes. Conclua-os antes de finalizar.',
        });
        return;
      }
    }

    const now = new Date().toISOString();
    let timeTracking = environment.timeTracking;

    if (target === 'backlog') {
      timeTracking = { start: null, end: null, totalMs: 0 };
    } else if (target === 'in_progress') {
      timeTracking = { start: timeTracking.start ?? now, end: null, totalMs: timeTracking.totalMs };
    } else if (target === 'done') {
      const startTimestamp = timeTracking.start
        ? new Date(timeTracking.start).getTime()
        : Date.now();
      const totalMs = timeTracking.totalMs + Math.max(0, Date.now() - startTimestamp);
      timeTracking = { start: timeTracking.start ?? now, end: now, totalMs };
    }

    try {
      await updateEnvironment(environment.id, { status: target, timeTracking });
      showToast({ type: 'success', message: 'Status atualizado com sucesso.' });
    } catch (error) {
      console.error(error);
      showToast({ type: 'error', message: 'Não foi possível atualizar o status.' });
    }
  };

  return (
    <Layout>
      <section className="page-container">
        <div className="page-header">
          <div>
            <button type="button" className="link-button" onClick={() => navigate(-1)}>
              &larr; Voltar
            </button>
            <h1 className="section-title">{environment?.identificador ?? 'Ambiente'}</h1>
            <p className="section-subtitle">
              Status: {environment ? STATUS_LABEL[environment.status] : 'Carregando'}
            </p>
          </div>
          {!isLoading && environment && (
            <div className="environment-actions">
              {environment.status === 'backlog' && (
                <Button type="button" onClick={() => handleStatusTransition('in_progress')}>
                  Iniciar execução
                </Button>
              )}
              {environment.status === 'in_progress' && (
                <Button type="button" onClick={() => handleStatusTransition('done')}>
                  Concluir ambiente
                </Button>
              )}
            </div>
          )}
        </div>

        {isLoading && <p className="section-subtitle">Carregando dados do ambiente...</p>}

        {!isLoading && environment && (
          <div className="environment-details">
            <div className="environment-details-card">
              <h3>Informações gerais</h3>
              <ul>
                <li>
                  <strong>Loja:</strong> {environment.loja}
                </li>
                <li>
                  <strong>Tipo de ambiente:</strong> {environment.tipoAmbiente}
                </li>
                <li>
                  <strong>Tipo de teste:</strong> {environment.tipoTeste}
                </li>
                <li>
                  <strong>Tempo total:</strong> {formattedTime}
                </li>
                <li>
                  <strong>Bugs:</strong> {environment.bugs}
                </li>
                <li>
                  <strong>Total de cenários:</strong> {environment.totalCenarios}
                </li>
                <li>
                  <strong>Jira:</strong> {environment.jiraTask || 'Não informado'}
                </li>
              </ul>
              <div>
                <strong>URLs</strong>
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
            </div>

            <div className="environment-details-card">
              <h3>Usuários presentes</h3>
              {presentUsers.length === 0 ? (
                <p className="section-subtitle">Nenhum usuário neste ambiente agora.</p>
              ) : (
                <ul className="environment-present-users">
                  {presentUsers.map((user) => (
                    <li key={user.id}>
                      {user.photoURL ? (
                        <img src={user.photoURL} alt={user.name} />
                      ) : (
                        <span className="environment-card-avatar environment-card-avatar--initials">
                          {user.name.charAt(0).toUpperCase()}
                        </span>
                      )}
                      <span>{user.name}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}

        {!isLoading && environment && (
          <div className="environment-evidence">
            <h3 className="section-subtitle">Evidências dos cenários</h3>
            <TabelaEvidencias environment={environment} isLocked={isLocked} />
          </div>
        )}
      </section>
    </Layout>
  );
};
