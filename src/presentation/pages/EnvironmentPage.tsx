import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';

import { EnvironmentStatusError } from '../../shared/errors/firebaseErrors';
import type { Environment, EnvironmentStatus } from '../../domain/entities/environment';
import type { UserSummary } from '../../domain/entities/user';
import type { SlackTaskSummaryPayload } from '../../infrastructure/external/slack';
import { environmentService } from '../../application/use-cases/EnvironmentUseCase';
import { slackService } from '../../application/use-cases/SlackUseCase';
import { Button } from '../components/Button';
import { Layout } from '../components/Layout';
import { useToast } from '../context/ToastContext';
import { useEnvironmentRealtime } from '../hooks/useEnvironmentRealtime';
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
import { useEnvironmentBugs } from '../hooks/useEnvironmentBugs';
import { EnvironmentBugModal } from '../components/environments/EnvironmentBugModal';
import type { EnvironmentBug } from '../../domain/entities/environment';
import { useEnvironmentDetails } from '../hooks/useEnvironmentDetails';
import { useEnvironmentEngagement } from '../hooks/useEnvironmentEngagement';
import { EnvironmentSummaryCard } from '../components/environments/EnvironmentSummaryCard';

interface SlackSummaryBuilderOptions {
  formattedTime: string;
  totalTimeMs: number;
  scenarioCount: number;
  executedScenariosCount: number;
  urls: string[];
  bugsCount: number;
  participantProfiles: UserSummary[];
}

const formatExecutedScenariosMessage = (count: number) => {
  if (count === 0) {
    return 'Nenhum cenário executado';
  }

  if (count === 1) {
    return '1 cenário executado';
  }

  return `${count} cenários executados`;
};

const buildSuiteDetails = (count: number) => {
  if (count === 0) {
    return 'Nenhum cenário vinculado';
  }

  return `${count} cenário${count > 1 ? 's' : ''} vinculados`;
};

const mapProfileToAttendee = (
  profile: UserSummary | undefined,
  fallbackId: string | null,
  index: number,
) => {
  const fallbackName = fallbackId ? `Participante ${fallbackId}` : `Participante ${index + 1}`;
  const trimmedName = profile?.displayName?.trim();

  return {
    name: trimmedName || profile?.email || fallbackName,
    email: profile?.email ?? 'Não informado',
  };
};

const buildAttendeesList = (
  environment: Environment,
  participantProfiles: UserSummary[],
): SlackTaskSummaryPayload['environmentSummary']['attendees'] => {
  const participantIds = Array.from(new Set(environment.participants ?? []));
  const profileMap = new Map(participantProfiles.map((profile) => [profile.id, profile]));
  const attendees = participantIds.map((participantId, index) =>
    mapProfileToAttendee(profileMap.get(participantId), participantId, index),
  );

  const knownParticipants = new Set(participantIds);
  participantProfiles
    .filter((profile) => !knownParticipants.has(profile.id))
    .forEach((profile, index) => {
      attendees.push(mapProfileToAttendee(profile, profile.id, participantIds.length + index));
    });

  return attendees;
};

const buildSlackTaskSummaryPayload = (
  environment: Environment,
  options: SlackSummaryBuilderOptions,
): SlackTaskSummaryPayload => {
  const suiteName = environment.suiteName?.trim() || 'Suíte não informada';
  const attendees = buildAttendeesList(environment, options.participantProfiles);
  const attendeeList = attendees ?? [];
  const uniqueParticipantsCount = new Set(environment.participants ?? []).size;
  const participantsCount = uniqueParticipantsCount || attendeeList.length;
  const monitoredUrls = (options.urls ?? []).filter(
    (url) => typeof url === 'string' && url.trim().length > 0,
  );
  const taskIdentifier = environment.identificador?.trim() || 'Não informado';
  const normalizedEnvironmentType = environment.tipoAmbiente?.trim().toUpperCase();
  const isWorkspaceEnvironment = normalizedEnvironmentType === 'WS';
  const fix = {
    type: isWorkspaceEnvironment ? 'storyfixes' : 'bug',
    value: options.bugsCount,
  } as const;

  return {
    environmentSummary: {
      identifier: taskIdentifier,
      totalTime: options.formattedTime || '00:00:00',
      totalTimeMs: options.totalTimeMs,
      scenariosCount: options.scenarioCount,
      executedScenariosCount: options.executedScenariosCount,
      executedScenariosMessage: formatExecutedScenariosMessage(options.executedScenariosCount),
      fix,
      jira: environment.jiraTask?.trim() || 'Não informado',
      suiteName,
      suiteDetails: buildSuiteDetails(options.scenarioCount),
      participantsCount,
      monitoredUrls,
      attendees: attendeeList,
    },
  };
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
  const [searchParams, setSearchParams] = useSearchParams();
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isBugModalOpen, setIsBugModalOpen] = useState(false);
  const [editingBug, setEditingBug] = useState<EnvironmentBug | null>(null);
  const [defaultBugScenarioId, setDefaultBugScenarioId] = useState<string | null>(null);
  const [isCopyingMarkdown, setIsCopyingMarkdown] = useState(false);
  const [isSendingSlackSummary, setIsSendingSlackSummary] = useState(false);
  const { setActiveOrganization } = useOrganizationBranding();
  const participantProfiles = useUserProfiles(environment?.participants ?? []);
  const { bugs, isLoading: isLoadingBugs } = useEnvironmentBugs(environment?.id ?? null);
  const {
    hasEnteredEnvironment,
    isLocked,
    isScenarioLocked,
    isInteractionLocked,
    canCopyPublicLink,
    isShareDisabled,
    isJoiningEnvironment,
    isLeavingEnvironment,
    enterEnvironment,
    leaveEnvironment,
  } = useEnvironmentEngagement(environment);
  const {
    bugCountByScenario,
    progressPercentage,
    progressLabel,
    scenarioCount,
    executedScenariosCount,
    headerMeta,
    urls,
    shareLinks,
  } = useEnvironmentDetails(environment, bugs);
  const slackWebhookUrl = environmentOrganization?.slackWebhookUrl?.trim() || null;
  const canSendSlackSummary = Boolean(slackWebhookUrl);
  const inviteParam = searchParams.get('invite');
  const shouldAutoJoinFromInvite = inviteParam === 'true' || inviteParam === '1';

  const clearInviteParam = useCallback(() => {
    if (!inviteParam) {
      return;
    }

    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete('invite');
    setSearchParams(nextParams, { replace: true });
  }, [inviteParam, searchParams, setSearchParams]);

  useEffect(() => {
    setActiveOrganization(environmentOrganization ?? null);

    return () => {
      setActiveOrganization(null);
    };
  }, [environmentOrganization, setActiveOrganization]);

  const { formattedTime, totalMs, formattedStart, formattedEnd } = useTimeTracking(
    environment?.timeTracking ?? null,
    environment?.status === 'in_progress',
  );

  const handleStatusTransition = useCallback(
    async (target: EnvironmentStatus) => {
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
    },
    [environment, showToast, user?.uid],
  );

  const handleCopyLink = useCallback(
    async (url: string) => {
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
    },
    [showToast],
  );

  const handleExportPDF = useCallback(() => {
    if (!environment) {
      return;
    }
    environmentService.exportAsPDF(environment, bugs, participantProfiles);
  }, [bugs, environment, participantProfiles]);

  const handleCopyMarkdown = useCallback(async () => {
    if (!environment) {
      return;
    }

    setIsCopyingMarkdown(true);

    try {
      await environmentService.copyAsMarkdown(environment, bugs, participantProfiles);
      showToast({ type: 'success', message: 'Markdown copiado para a área de transferência.' });
    } catch (error) {
      console.error(error);
      showToast({ type: 'error', message: 'Não foi possível copiar o Markdown.' });
    } finally {
      setIsCopyingMarkdown(false);
    }
  }, [bugs, environment, participantProfiles, showToast]);

  const handleSendSlackSummary = useCallback(async () => {
    if (!environment) {
      return;
    }

    if (!slackWebhookUrl) {
      showToast({
        type: 'error',
        message: 'Configure um webhook do Slack na organização para enviar o resumo.',
      });
      return;
    }

    setIsSendingSlackSummary(true);

    try {
      const payload = buildSlackTaskSummaryPayload(environment, {
        formattedTime,
        totalTimeMs: totalMs,
        scenarioCount,
        executedScenariosCount,
        urls,
        bugsCount: bugs.length,
        participantProfiles,
      });

      payload.webhookUrl = slackWebhookUrl;

      await slackService.sendTaskSummary(payload);

      showToast({
        type: 'success',
        message: 'Resumo enviado para o Slack com sucesso.',
      });
    } catch (error) {
      console.error(error);
      const errorMessage =
        error instanceof Error ? error.message : 'Não foi possível enviar o resumo para o Slack.';
      showToast({
        type: 'error',
        message: errorMessage,
      });
    } finally {
      setIsSendingSlackSummary(false);
    }
  }, [
    bugs.length,
    environment,
    executedScenariosCount,
    formattedTime,
    participantProfiles,
    scenarioCount,
    showToast,
    slackWebhookUrl,
    totalMs,
    urls,
  ]);

  const openCreateBugModal = useCallback((scenarioId: string) => {
    setEditingBug(null);
    setDefaultBugScenarioId(scenarioId);
    setIsBugModalOpen(true);
  }, []);

  const handleEditBug = useCallback((bug: EnvironmentBug) => {
    setEditingBug(bug);
    setDefaultBugScenarioId(bug.scenarioId ?? null);
    setIsBugModalOpen(true);
  }, []);

  const closeBugModal = useCallback(() => {
    setIsBugModalOpen(false);
    setEditingBug(null);
    setDefaultBugScenarioId(null);
  }, []);

  const handleScenarioBugRequest = useCallback(
    (scenarioId: string) => {
      openCreateBugModal(scenarioId);
    },
    [openCreateBugModal],
  );

  const handleEnterEnvironment = useCallback(async () => {
    try {
      await enterEnvironment();
      return true;
    } catch (error) {
      console.error(error);
      showToast({ type: 'error', message: 'Não foi possível entrar no ambiente.' });
      return false;
    }
  }, [enterEnvironment, showToast]);

  const handleLeaveEnvironment = useCallback(async () => {
    try {
      await leaveEnvironment();
      showToast({ type: 'success', message: 'Você saiu do ambiente.' });
    } catch (error) {
      console.error(error);
      showToast({ type: 'error', message: 'Não foi possível sair do ambiente.' });
    }
  }, [leaveEnvironment, showToast]);

  useEffect(() => {
    if (!shouldAutoJoinFromInvite) {
      return;
    }

    if (hasEnteredEnvironment || isLocked) {
      clearInviteParam();
      return;
    }

    const attemptAutoJoin = async () => {
      await handleEnterEnvironment();
      clearInviteParam();
    };

    void attemptAutoJoin();
  }, [
    clearInviteParam,
    handleEnterEnvironment,
    hasEnteredEnvironment,
    isLocked,
    shouldAutoJoinFromInvite,
  ]);

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
      <section className="page-container environment-page" data-testid="environment-page">
        <div className="environment-page__header">
          <div>
            <button type="button" className="link-button" onClick={() => navigate(-1)}>
              &larr; Voltar
            </button>
            <div>
              <h1 className="section-title">{environment.identificador ?? 'Ambiente'}</h1>
              <p className="section-subtitle">
                {environment.tipoAmbiente} · {environment.tipoTeste}
              </p>
              {headerMeta.length > 0 && (
                <p className="section-subtitle">{headerMeta.join(' · ')}</p>
              )}
            </div>
          </div>
          <div className="environment-actions">
            {!hasEnteredEnvironment && !isLocked ? (
              <Button
                type="button"
                onClick={handleEnterEnvironment}
                isLoading={isJoiningEnvironment}
                loadingText="Entrando..."
                data-testid="enter-environment-button"
              >
                Entrar no ambiente
              </Button>
            ) : (
              <>
                {environment.status === 'backlog' && (
                  <Button
                    type="button"
                    onClick={() => handleStatusTransition('in_progress')}
                    data-testid="start-environment-button"
                  >
                    Iniciar execução
                  </Button>
                )}
                {environment.status === 'in_progress' && (
                  <Button
                    type="button"
                    onClick={() => handleStatusTransition('done')}
                    data-testid="finish-environment-button"
                  >
                    Concluir ambiente
                  </Button>
                )}
                {hasEnteredEnvironment && environment.status !== 'done' && (
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={handleLeaveEnvironment}
                    isLoading={isLeavingEnvironment}
                    loadingText="Saindo..."
                    data-testid="leave-environment-button"
                  >
                    Sair do ambiente
                  </Button>
                )}
                {hasEnteredEnvironment && (
                  <>
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => setIsEditOpen(true)}
                      data-testid="edit-environment-button"
                    >
                      Editar
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => setIsDeleteOpen(true)}
                      data-testid="delete-environment-button"
                    >
                      Excluir
                    </Button>
                  </>
                )}
              </>
            )}
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
            participants={participantProfiles}
            bugsCount={bugs.length}
          />
          <div className="summary-card">
            <h3>Compartilhamento e exportação</h3>
            <div className="share-actions">
              <Button
                type="button"
                variant="secondary"
                onClick={() => handleCopyLink(shareLinks.invite)}
                disabled={isShareDisabled}
                data-testid="copy-invite-button"
              >
                Convidar para o ambiente
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => handleCopyLink(shareLinks.public)}
                disabled={!canCopyPublicLink}
                data-testid="copy-public-link-button"
              >
                Copiar link público
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={handleExportPDF}
                disabled={isShareDisabled}
                data-testid="export-environment-pdf"
              >
                Exportar PDF
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={handleCopyMarkdown}
                disabled={isShareDisabled}
                isLoading={isCopyingMarkdown}
                loadingText="Copiando..."
                data-testid="copy-markdown-button"
              >
                Copiar Markdown
              </Button>
              {canSendSlackSummary && (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={handleSendSlackSummary}
                  disabled={isSendingSlackSummary}
                  isLoading={isSendingSlackSummary}
                  loadingText="Enviando..."
                  data-testid="send-slack-summary"
                >
                  Enviar resumo para o Slack
                </Button>
              )}
            </div>
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
            organizationId={environmentOrganization?.id ?? null}
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
