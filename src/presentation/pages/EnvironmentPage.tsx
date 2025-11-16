import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { EnvironmentStatusError } from '../../application/errors/EnvironmentStatusError';
import type { EnvironmentStatus } from '../../domain/entities/Environment';
import { environmentService } from '../../main/factories/environmentServiceFactory';
import { Layout } from '../components/Layout';
import { Button } from '../components/Button';
import { useToast } from '../context/ToastContext';
import { useEnvironmentRealtime } from '../hooks/useEnvironmentRealtime';
import { usePresentUsers } from '../hooks/usePresentUsers';
import { useTimeTracking } from '../hooks/useTimeTracking';
import { useAuth } from '../hooks/useAuth';
import { EnvironmentEvidenceTable } from '../components/environments/EnvironmentEvidenceTable';
import { EditEnvironmentModal } from '../components/environments/EditEnvironmentModal';
import { DeleteEnvironmentModal } from '../components/environments/DeleteEnvironmentModal';
import { copyToClipboard } from '../utils/clipboard';

const STATUS_LABEL: Record<EnvironmentStatus, string> = {
  backlog: 'Backlog',
  in_progress: 'Em andamento',
  done: 'Concluído',
};

export const EnvironmentPage = () => {
  const { environmentId } = useParams<{ environmentId: string }>();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { user } = useAuth();
  const { environment, isLoading } = useEnvironmentRealtime(environmentId);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [hasEnteredEnvironment, setHasEnteredEnvironment] = useState(false);
  const isLocked = environment?.status === 'done';
  const isScenarioLocked = environment?.status !== 'in_progress';

  const { presentUsers, isCurrentUserPresent, joinEnvironment } = usePresentUsers({
    environmentId: environment?.id ?? null,
    presentUsersIds: environment?.presentUsersIds ?? [],
    isLocked: Boolean(isLocked) || !hasEnteredEnvironment,
  });

  const entryStorageKey = useMemo(() => {
    if (!environment?.id || !user?.uid) {
      return null;
    }
    return `environment-entry:${environment.id}:${user.uid}`;
  }, [environment?.id, user?.uid]);

  useEffect(() => {
    if (!entryStorageKey || typeof window === 'undefined') {
      return;
    }

    const storedEntry = window.localStorage.getItem(entryStorageKey);
    if (storedEntry === 'true') {
      setHasEnteredEnvironment(true);
    }
  }, [entryStorageKey]);

  useEffect(() => {
    if (isCurrentUserPresent && !hasEnteredEnvironment) {
      setHasEnteredEnvironment(true);
    }
  }, [hasEnteredEnvironment, isCurrentUserPresent]);

  const { formattedTime } = useTimeTracking(
    environment?.timeTracking ?? null,
    environment?.status === 'in_progress',
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

  const handleStatusTransition = async (target: EnvironmentStatus) => {
    if (!environment) {
      return;
    }

    try {
      await environmentService.transitionStatus({
        environment,
        targetStatus: target,
        currentUserId: user?.uid ?? null,
      });

      showToast({
        type: 'success',
        message: target === 'done' ? 'Ambiente concluído.' : 'Status atualizado com sucesso.',
      });
    } catch (error) {
      if (error instanceof EnvironmentStatusError && error.code === 'PENDING_SCENARIOS') {
        showToast({
          type: 'error',
          message: 'Existem cenários pendentes. Conclua-os antes de finalizar.',
        });
        return;
      }

      console.error(error);
      showToast({ type: 'error', message: 'Não foi possível atualizar o status.' });
    }
  };

  const handleCopyLink = async (url: string) => {
    if (!url) {
      return;
    }

    try {
      await copyToClipboard(url);
      showToast({ type: 'success', message: 'Link copiado para a área de transferência.' });
    } catch (error) {
      console.error(error);
      showToast({ type: 'error', message: 'Não foi possível copiar o link.' });
    }
  };

  const handleExportPDF = () => {
    if (!environment) {
      return;
    }
    environmentService.exportAsPDF(environment);
  };

  const handleExportMarkdown = () => {
    if (!environment) {
      return;
    }
    environmentService.exportAsMarkdown(environment);
  };

  const handleEnterEnvironment = () => {
    if (hasEnteredEnvironment || isLocked) {
      return;
    }

    setHasEnteredEnvironment(true);

    if (entryStorageKey && typeof window !== 'undefined') {
      window.localStorage.setItem(entryStorageKey, 'true');
    }

    void joinEnvironment();
  };

  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const privateLink = environment ? `${origin}/environments/${environment.id}` : '';
  const publicLink = environment ? `${origin}/environments/${environment.id}/public` : '';

  return (
    <Layout>
      <section className="page-container environment-page">
        <div className="environment-page__header">
          <div>
            <button type="button" className="link-button" onClick={() => navigate(-1)}>
              &larr; Voltar
            </button>
            <div className="environment-page__title">
              <h1 className="section-title">{environment?.identificador ?? 'Ambiente'}</h1>
              {environment && (
                <p className="section-subtitle">
                  {environment.tipoAmbiente} · {environment.tipoTeste} · {suiteDescription}
                </p>
              )}
              {hasEnteredEnvironment && presentUsers.length > 0 && (
                <div className="environment-presence-inline">
                  <span className="environment-presence-inline__label">Usuários no ambiente</span>
                  <ul className="environment-present-users environment-present-users--inline">
                    {presentUsers.map((profile) => (
                      <li key={profile.id}>
                        {profile.photoURL ? (
                          <img src={profile.photoURL} alt={profile.name} />
                        ) : (
                          <span className="environment-card-avatar environment-card-avatar--initials">
                            {profile.name.charAt(0).toUpperCase()}
                          </span>
                        )}
                        <span>{profile.name}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
          {!isLoading && environment && (
            <div className="environment-actions">
              {!hasEnteredEnvironment ? (
                <Button type="button" onClick={handleEnterEnvironment}>
                  Entrar no ambiente
                </Button>
              ) : (
                <>
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
                  {environment.status !== 'done' && (
                    <>
                      <Button type="button" variant="ghost" onClick={() => setIsEditOpen(true)}>
                        Editar
                      </Button>
                      <Button type="button" variant="ghost" onClick={() => setIsDeleteOpen(true)}>
                        Excluir
                      </Button>
                    </>
                  )}
                </>
              )}
            </div>
          )}
        </div>

        {isLoading && <p className="section-subtitle">Carregando dados do ambiente...</p>}

        {!isLoading && environment && (
          <>
            <div
              className={`environment-status-card environment-status-card--${environment.status}`}
            >
              <span className="environment-status-card__label">Status do ambiente</span>
              <span className="environment-status-card__value">
                {STATUS_LABEL[environment.status]}
              </span>
            </div>

            {!hasEnteredEnvironment && (
              <p className="environment-locked-message">
                Entre no ambiente para visualizar os dados completos e liberar as funcionalidades.
              </p>
            )}

            {hasEnteredEnvironment && (
              <>
                <div className="environment-summary-grid">
                  <div className="summary-card">
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
                    <p>
                      <strong>Tempo total:</strong> {formattedTime}
                    </p>
                    <p>
                      <strong>Jira:</strong> {environment.jiraTask || 'Não informado'}
                    </p>
                    <p>
                      <strong>Suíte:</strong> {suiteDescription}
                    </p>
                    <p>
                      <strong>Bugs:</strong> {environment.bugs}
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
                    <h3>Compartilhamento e exportação</h3>
                    <div className="share-actions">
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={() => handleCopyLink(privateLink)}
                        disabled={isLocked}
                      >
                        Copiar link do ambiente
                      </Button>
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={() => handleCopyLink(publicLink)}
                      >
                        Copiar link público
                      </Button>
                      <Button type="button" variant="ghost" onClick={handleExportPDF}>
                        Exportar PDF
                      </Button>
                      <Button type="button" variant="ghost" onClick={handleExportMarkdown}>
                        Exportar Markdown
                      </Button>
                    </div>
                    {isLocked && (
                      <p className="section-subtitle">
                        Ambiente concluído: compartilhamento bloqueado para novos acessos.
                      </p>
                    )}
                  </div>
                </div>

                <div className="environment-evidence">
                  <div className="environment-evidence__header">
                    <h3 className="section-title">Cenários e evidências</h3>
                    <a
                      href={`/environments/${environment.id}/public`}
                      className="link-button"
                      target="_blank"
                      rel="noreferrer"
                    >
                      Abrir preview público ↗
                    </a>
                  </div>
                  <EnvironmentEvidenceTable
                    environment={environment}
                    isLocked={Boolean(isScenarioLocked)}
                  />
                </div>
              </>
            )}
          </>
        )}
      </section>

      <EditEnvironmentModal
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        environment={environment ?? null}
      />
      <DeleteEnvironmentModal
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        environment={environment ?? null}
        onDeleted={() => navigate(-1)}
      />
    </Layout>
  );
};
