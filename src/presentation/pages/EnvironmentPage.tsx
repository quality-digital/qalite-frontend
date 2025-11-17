import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { EnvironmentStatusError } from '../../application/errors/EnvironmentStatusError';
import {
  getScenarioPlatformStatuses,
  SCENARIO_COMPLETED_STATUSES,
} from '../../domain/entities/Environment';
import type {
  EnvironmentScenarioPlatform,
  EnvironmentStatus,
} from '../../domain/entities/Environment';
import { environmentService } from '../../main/factories/environmentServiceFactory';
import { Button } from '../components/Button';
import { Layout } from '../components/Layout';
import { useToast } from '../context/ToastContext';
import { useEnvironmentRealtime } from '../hooks/useEnvironmentRealtime';
import { usePresentUsers } from '../hooks/usePresentUsers';
import { useTimeTracking } from '../hooks/useTimeTracking';
import { useAuth } from '../hooks/useAuth';
import { EnvironmentEvidenceTable } from '../components/environments/EnvironmentEvidenceTable';
import { EnvironmentBugList } from '../components/environments/EnvironmentBugList';
import { EditEnvironmentModal } from '../components/environments/EditEnvironmentModal';
import { DeleteEnvironmentModal } from '../components/environments/DeleteEnvironmentModal';
import { copyToClipboard } from '../utils/clipboard';
import { useStoreOrganizationBranding } from '../hooks/useStoreOrganizationBranding';
import { useOrganizationBranding } from '../context/OrganizationBrandingContext';
import { PageLoader } from '../components/PageLoader';
import { useUserProfiles } from '../hooks/useUserProfiles';
import { getReadableUserName, getUserInitials } from '../utils/userDisplay';
import { useEnvironmentBugs } from '../hooks/useEnvironmentBugs';
import { EnvironmentBugModal } from '../components/environments/EnvironmentBugModal';
import type { EnvironmentBug } from '../../domain/entities/EnvironmentBug';

const STATUS_LABEL: Record<EnvironmentStatus, string> = {
  backlog: 'Backlog',
  in_progress: 'Em andamento',
  done: 'Concluído',
};

const PLATFORM_LABEL: Record<EnvironmentScenarioPlatform, string> = {
  mobile: 'Mobile',
  desktop: 'Desktop',
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
  const [isBugModalOpen, setIsBugModalOpen] = useState(false);
  const [editingBug, setEditingBug] = useState<EnvironmentBug | null>(null);
  const [defaultBugScenarioId, setDefaultBugScenarioId] = useState<string | null>(null);
  const [hasEnteredEnvironment, setHasEnteredEnvironment] = useState(false);
  const isLocked = environment?.status === 'done';
  const isScenarioLocked = environment?.status !== 'in_progress' || !hasEnteredEnvironment;
  const isInteractionLocked = !hasEnteredEnvironment || Boolean(isLocked);
  const canCopyPublicLink = hasEnteredEnvironment;

  const { isCurrentUserPresent, joinEnvironment } = usePresentUsers({
    environmentId: environment?.id ?? null,
    presentUsersIds: environment?.presentUsersIds ?? [],
    isLocked: Boolean(isLocked) || !hasEnteredEnvironment,
  });
  const { setActiveOrganization } = useOrganizationBranding();
  const participantProfiles = useUserProfiles(environment?.participants ?? []);
  const { bugs, isLoading: isLoadingBugs } = useEnvironmentBugs(environment?.id ?? null);
  const bugCountByScenario = useMemo(() => {
    return bugs.reduce<Record<string, number>>((acc, bug) => {
      if (!bug.scenarioId) {
        return acc;
      }
      acc[bug.scenarioId] = (acc[bug.scenarioId] ?? 0) + 1;
      return acc;
    }, {});
  }, [bugs]);

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
          message: 'Existem cenários pendentes ou em andamento. Conclua-os antes de finalizar.',
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

  const openCreateBugModal = (scenarioId: string) => {
    setEditingBug(null);
    setDefaultBugScenarioId(scenarioId);
    setIsBugModalOpen(true);
  };

  const handleEditBug = (bug: EnvironmentBug) => {
    setEditingBug(bug);
    setDefaultBugScenarioId(bug.scenarioId ?? null);
    setIsBugModalOpen(true);
  };

  const closeBugModal = () => {
    setIsBugModalOpen(false);
    setEditingBug(null);
    setDefaultBugScenarioId(null);
  };

  const handleScenarioBugRequest = (scenarioId: string) => {
    openCreateBugModal(scenarioId);
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

  const headerMeta: string[] = [];
  if (environment.momento) {
    headerMeta.push(`Momento: ${environment.momento}`);
  }
  if (environment.release) {
    headerMeta.push(`Release: ${environment.release}`);
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
              {headerMeta.length > 0 && (
                <p className="section-subtitle">{headerMeta.join(' · ')}</p>
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
                      <a href={url} className="text-link" target="_blank" rel="noreferrer noopener">
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
                disabled={!canCopyPublicLink}
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
            onRegisterBug={handleScenarioBugRequest}
            bugCountByScenario={bugCountByScenario}
          />
        </div>

        <EnvironmentBugList
          environment={environment}
          bugs={bugs}
          isLocked={Boolean(isInteractionLocked)}
          isLoading={isLoadingBugs}
          onEdit={handleEditBug}
        />
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
      {environment && (
        <EnvironmentBugModal
          environment={environment}
          isOpen={isBugModalOpen}
          bug={editingBug}
          onClose={closeBugModal}
          initialScenarioId={editingBug ? (editingBug.scenarioId ?? null) : defaultBugScenarioId}
        />
      )}
    </Layout>
  );
};
