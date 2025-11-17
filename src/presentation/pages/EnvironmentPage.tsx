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
import { useStoreOrganizationBranding } from '../hooks/useStoreOrganizationBranding';
import { useOrganizationBranding } from '../context/OrganizationBrandingContext';
import { PageLoader } from '../components/PageLoader';
import { useUserProfiles } from '../hooks/useUserProfiles';
import { getReadableUserName, getUserInitials } from '../utils/userDisplay';

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
  const { organization: environmentOrganization } = useStoreOrganizationBranding(
    environment?.storeId ?? null,
  );
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [hasEnteredEnvironment, setHasEnteredEnvironment] = useState(false);
  const isLocked = environment?.status === 'done';
  const isScenarioLocked = environment?.status !== 'in_progress' || !hasEnteredEnvironment;
  const isInteractionLocked = !hasEnteredEnvironment || Boolean(isLocked);

  const { presentUsers, isCurrentUserPresent, joinEnvironment } = usePresentUsers({
    environmentId: environment?.id ?? null,
    presentUsersIds: environment?.presentUsersIds ?? [],
    isLocked: Boolean(isLocked) || !hasEnteredEnvironment,
  });
  const { setActiveOrganization } = useOrganizationBranding();
  const participantProfiles = useUserProfiles(environment?.participants ?? []);

  useEffect(() => {
    setActiveOrganization(environmentOrganization ?? null);

    return () => {
      setActiveOrganization(null);
    };
  }, [environmentOrganization, setActiveOrganization]);

  useEffect(() => {
    if (isCurrentUserPresent && !hasEnteredEnvironment) {
      setHasEnteredEnvironment(true);
    }
  }, [hasEnteredEnvironment, isCurrentUserPresent]);

  useEffect(() => {
    if (!environment?.id || !user?.uid) {
      setHasEnteredEnvironment(false);
      return;
    }

    const hasPersistedEntry = environment.participants?.includes(user.uid) ?? false;
    if (hasPersistedEntry && !hasEnteredEnvironment) {
      setHasEnteredEnvironment(true);
      return;
    }

    if (!hasPersistedEntry && !isCurrentUserPresent) {
      setHasEnteredEnvironment(false);
    }
  }, [
    environment?.id,
    environment?.participants,
    hasEnteredEnvironment,
    isCurrentUserPresent,
    user?.uid,
  ]);

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

  const progressPercentage = useMemo(() => {
    if (scenarioStats.total === 0) {
      return 0;
    }

    return Math.round((scenarioStats.concluded / scenarioStats.total) * 100);
  }, [scenarioStats.concluded, scenarioStats.total]);

  const progressLabel =
    scenarioStats.total === 0
      ? 'Nenhum cenário cadastrado ainda.'
      : `${scenarioStats.concluded} de ${scenarioStats.total} concluídos`;

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

    void joinEnvironment();
  };

  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const privateLink = environment ? `${origin}/environments/${environment.id}` : '';
  const publicLink = environment ? `${origin}/environments/${environment.id}/public` : '';

  if (isLoading) {
    return (
      <Layout>
        <div className="page-container">
          <PageLoader message="Carregando dados do ambiente..." />
        </div>
      </Layout>
    );
  }

  if (!environment) {
    return (
      <Layout>
        <section className="page-container environment-page">
          <button type="button" className="link-button" onClick={() => navigate(-1)}>
            &larr; Voltar
          </button>
          <p className="section-subtitle">Ambiente não encontrado.</p>
        </section>
      </Layout>
    );
  }

  return (
    <Layout>
      <section className="page-container environment-page">
        <div className="environment-page__header">
          <div>
            <button type="button" className="link-button" onClick={() => navigate(-1)}>
              &larr; Voltar
            </button>
            <div>
              <h1 className="section-title">{environment.identificador ?? 'Ambiente'}</h1>
              <p className="section-subtitle">
                {environment.tipoAmbiente} · {environment.tipoTeste} · {suiteDescription}
              </p>
              {presentUsers.length > 0 && (
                <div className="environment-presence-inline">
                  <span className="environment-presence-inline__label">Usuários no ambiente</span>
                  <ul className="environment-present-users environment-present-users--inline">
                    {presentUsers.map((profile) => {
                      const readableName = getReadableUserName(profile);
                      const initials = getUserInitials(readableName);
                      return (
                        <li key={profile.id}>
                          {profile.photoURL ? (
                            <img src={profile.photoURL} alt={readableName} />
                          ) : (
                            <span className="environment-card-avatar environment-card-avatar--initials">
                              {initials}
                            </span>
                          )}
                          <span>{readableName}</span>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
            </div>
          </div>
          <div className="environment-actions">
            {!hasEnteredEnvironment && !isLocked ? (
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
        </div>

        {!hasEnteredEnvironment && (
          <p>
            Você pode visualizar os dados do ambiente sem entrar. Entre no ambiente apenas se
            precisar interagir com as funcionalidades.
          </p>
        )}

        <div className="environment-summary-grid">
          <div className="summary-card summary-card--environment">
            <h3>Resumo do ambiente</h3>
            <div className="summary-card__status">
              <span className="summary-card__status-label">Status atual</span>
              <span
                className={`summary-card__status-badge summary-card__status-badge--${environment.status}`}
              >
                {STATUS_LABEL[environment.status]}
              </span>
            </div>
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
            <div className="summary-card__metrics summary-card__metrics--pill">
              <div className="summary-pill">
                <span>Total de cenários</span>
                <strong>{scenarioStats.total}</strong>
              </div>
              <div className="summary-pill">
                <span>Concluídos</span>
                <strong>{scenarioStats.concluded}</strong>
              </div>
              <div className="summary-pill">
                <span>Em andamento</span>
                <strong>{scenarioStats.running}</strong>
              </div>
              <div className="summary-pill">
                <span>Pendentes</span>
                <strong>{scenarioStats.pending}</strong>
              </div>
            </div>
            <div className="summary-card__details">
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
            <div className="summary-card__section">
              <span className="summary-card__label">Participantes</span>
              {participantProfiles.length === 0 ? (
                <p className="summary-card__empty">Nenhum participante registrado.</p>
              ) : (
                <ul className="environment-summary-participants">
                  {participantProfiles.map((participant) => {
                    const readableName = getReadableUserName(participant);
                    const initials = getUserInitials(readableName);
                    return (
                      <li key={participant.id} className="environment-summary-participant">
                        {participant.photoURL ? (
                          <img
                            src={participant.photoURL}
                            alt={readableName}
                            className="environment-card-avatar"
                          />
                        ) : (
                          <span className="environment-card-avatar environment-card-avatar--initials">
                            {initials}
                          </span>
                        )}
                        <div className="environment-summary-participant-info">
                          <strong>{readableName}</strong>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>
          <div className="summary-card">
            <h3>Compartilhamento e exportação</h3>
            <div className="share-actions">
              <Button
                type="button"
                variant="secondary"
                onClick={() => handleCopyLink(privateLink)}
                disabled={isInteractionLocked}
              >
                Copiar link do ambiente
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => handleCopyLink(publicLink)}
                disabled={isInteractionLocked}
              >
                Copiar link público
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={handleExportPDF}
                disabled={isInteractionLocked}
              >
                Exportar PDF
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={handleExportMarkdown}
                disabled={isInteractionLocked}
              >
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
          </div>
          <EnvironmentEvidenceTable
            environment={environment}
            isLocked={Boolean(isScenarioLocked)}
          />
        </div>
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
