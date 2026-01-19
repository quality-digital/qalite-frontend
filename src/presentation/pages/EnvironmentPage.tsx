import { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

import { EnvironmentStatusError } from '../../shared/errors/firebaseErrors';
import type {
  Environment,
  EnvironmentScenarioStatus,
  EnvironmentStatus,
} from '../../domain/entities/environment';
import type { UserSummary } from '../../domain/entities/user';
import type { SlackTaskSummaryPayload } from '../../infrastructure/external/slack';
import { environmentService } from '../../application/use-cases/EnvironmentUseCase';
import { storeService } from '../../application/use-cases/StoreUseCase';
import { slackService } from '../../application/use-cases/SlackUseCase';
import { BackButton } from '../components/BackButton';
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
import { Modal } from '../components/Modal';
import { LinkifiedText } from '../components/LinkifiedText';
import { useUserProfiles } from '../hooks/useUserProfiles';
import { useEnvironmentBugs } from '../hooks/useEnvironmentBugs';
import { EnvironmentBugModal } from '../components/environments/EnvironmentBugModal';
import type { EnvironmentBug } from '../../domain/entities/environment';
import type { StoreScenario, StoreSuite } from '../../domain/entities/store';
import { useEnvironmentDetails } from '../hooks/useEnvironmentDetails';
import { useEnvironmentEngagement } from '../hooks/useEnvironmentEngagement';
import { EnvironmentSummaryCard } from '../components/environments/EnvironmentSummaryCard';
import { TOptions } from 'i18next';
import { useScenarioEvidence } from '../hooks/useScenarioEvidence';
import { getScenarioPlatformStatuses } from '../../infrastructure/external/environments';
import {
  getAutomationLabelKey,
  getCriticalityClassName,
  getCriticalityLabelKey,
} from '../constants/scenarioOptions';
import {
  CopyIcon,
  FileTextIcon,
  LinkIcon,
  SettingsIcon,
  UsersGroupIcon,
} from '../components/icons';

interface SlackSummaryBuilderOptions {
  formattedTime: string;
  totalTimeMs: number;
  scenarioCount: number;
  executedScenariosCount: number;
  progressLabel: string;
  publicLink: string;
  urls: string[];
  bugsCount: number;
  participantProfiles: UserSummary[];
}

const formatExecutedScenariosMessage = (
  count: number,
  translation: (key: string, opts?: TOptions) => string,
) => {
  if (count === 0) {
    return translation('dynamic.executedScenarios.none');
  }

  if (count === 1) {
    return translation('dynamic.executedScenarios.one');
  }

  return translation('dynamic.executedScenarios.many', { count });
};

const buildSuiteDetails = (
  count: number,
  translation: (key: string, opts?: TOptions) => string,
) => {
  if (count === 0) {
    return translation('dynamic.suite.none');
  }

  return translation('dynamic.suite.many', { count });
};

const mapProfileToAttendee = (
  profile: UserSummary | undefined,
  fallbackId: string | null,
  index: number,
  translation: (key: string, opts?: TOptions) => string,
) => {
  const fallbackName = fallbackId
    ? translation('dynamic.fallbackParticipant', { id: fallbackId })
    : translation('dynamic.fallbackParticipant', { id: index + 1 });
  const trimmedName = profile?.displayName?.trim();

  return {
    name: trimmedName || profile?.email || fallbackName,
    email: profile?.email ?? translation('dynamic.noEmail'),
  };
};

const buildAttendeesList = (
  environment: Environment,
  participantProfiles: UserSummary[],
  translation: (key: string, opts?: TOptions) => string,
): SlackTaskSummaryPayload['environmentSummary']['attendees'] => {
  const participantIds = Array.from(new Set(environment.participants ?? []));
  const profileMap = new Map(participantProfiles.map((profile) => [profile.id, profile]));
  const attendees = participantIds.map((participantId, index) =>
    mapProfileToAttendee(profileMap.get(participantId), participantId, index, translation),
  );

  const knownParticipants = new Set(participantIds);
  participantProfiles
    .filter((profile) => !knownParticipants.has(profile.id))
    .forEach((profile, index) => {
      attendees.push(
        mapProfileToAttendee(profile, profile.id, participantIds.length + index, translation),
      );
    });

  return attendees;
};

const buildSlackTaskSummaryPayload = (
  environment: Environment,
  options: SlackSummaryBuilderOptions,
  translation: (key: string, opts?: TOptions) => string,
): SlackTaskSummaryPayload => {
  const suiteName = environment.suiteName?.trim() || translation('dynamic.suiteNameFallback');
  const attendees = buildAttendeesList(environment, options.participantProfiles, translation);
  const attendeeList = attendees ?? [];
  const uniqueParticipantsCount = new Set(environment.participants ?? []).size;
  const participantsCount = uniqueParticipantsCount || attendeeList.length;
  const monitoredUrls = (options.urls ?? []).filter(
    (url) => typeof url === 'string' && url.trim().length > 0,
  );
  const taskIdentifier =
    environment.identificador?.trim() || translation('dynamic.identifierFallback');
  const normalizedEnvironmentType = environment.tipoAmbiente?.trim().toUpperCase();
  const isWorkspaceEnvironment = normalizedEnvironmentType === 'WS';
  const fix = {
    type: isWorkspaceEnvironment ? 'storyfixes' : 'bug',
    value: options.bugsCount,
  } as const;
  const monitoredUrlsList =
    monitoredUrls.length > 0
      ? monitoredUrls.map((url) => `  - ${url}`)
      : [`  - ${translation('environment.slack.emptyList')}`];
  const attendeesList =
    attendeeList.length > 0
      ? attendeeList.map((attendee) => `• ${attendee.name} (${attendee.email})`)
      : [`• ${translation('environment.slack.emptyParticipants')}`];
  const summaryMessage = [
    translation('environment.slack.summaryHeader'),
    `• ${translation('environment.slack.fields.environment')}: ${taskIdentifier}`,
    `• ${translation('environment.slack.fields.totalTime')}: ${options.formattedTime || '00:00:00'}`,
    `• ${translation('environment.slack.fields.scenarios')}: ${options.scenarioCount}`,
    `• ${translation('environment.slack.fields.execution')}: ${formatExecutedScenariosMessage(
      options.executedScenariosCount,
      translation,
    )}`,
    `• ${translation('environment.slack.fields.bugs')}: ${fix.value}`,
    `• ${translation('environment.slack.fields.jira')}: ${
      environment.jiraTask?.trim() || translation('dynamic.identifierFallback')
    }`,
    `• ${translation('environment.slack.fields.suite')}: ${suiteName} — ${buildSuiteDetails(
      options.scenarioCount,
      translation,
    )}`,
    `• ${translation('environment.slack.fields.participants')}: ${participantsCount}`,
    `${translation('environment.slack.fields.monitoredUrls')}:`,
    ...monitoredUrlsList,
    '',
    translation('environment.slack.participantsTitle'),
    ...attendeesList,
  ].join('\n');

  return {
    environmentSummary: {
      identifier: taskIdentifier,
      totalTime: options.formattedTime || '00:00:00',
      totalTimeMs: options.totalTimeMs,
      scenariosCount: options.scenarioCount,
      executedScenariosCount: options.executedScenariosCount,
      executedScenariosMessage: formatExecutedScenariosMessage(
        options.executedScenariosCount,
        translation,
      ),
      fix,
      jira: environment.jiraTask?.trim() || translation('dynamic.identifierFallback'),
      suiteName,
      suiteDetails: buildSuiteDetails(options.scenarioCount, translation),
      participantsCount,
      monitoredUrls,
      attendees: attendeeList,
    },
    message: summaryMessage,
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
  const [scenarioDetailsId, setScenarioDetailsId] = useState<string | null>(null);
  const [modalEvidenceLink, setModalEvidenceLink] = useState('');
  const [isCopyingMarkdown, setIsCopyingMarkdown] = useState(false);
  const [isSendingSlackSummary, setIsSendingSlackSummary] = useState(false);
  const [suites, setSuites] = useState<StoreSuite[]>([]);
  const [scenarios, setScenarios] = useState<StoreScenario[]>([]);
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
  const { isUpdating: isUpdatingEvidence, handleEvidenceUpload } = useScenarioEvidence(
    environment?.id,
  );
  const { t: translation, i18n } = useTranslation();
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
  const inviteParam = searchParams.get('invite');
  const shouldAutoJoinFromInvite = inviteParam === 'true' || inviteParam === '1';
  const detailScenario = scenarioDetailsId ? environment?.scenarios?.[scenarioDetailsId] : null;
  const detailScenarioStatus = detailScenario ? getScenarioPlatformStatuses(detailScenario) : null;
  const isDetailScenarioRunning = Boolean(
    detailScenarioStatus &&
      Object.values(detailScenarioStatus).some((status) => status === 'em_andamento'),
  );
  const formatAutomationLabel = (value?: string | null) => {
    const labelKey = getAutomationLabelKey(value);
    if (labelKey) {
      return translation(labelKey);
    }
    return value?.trim() || translation('storeSummary.emptyValue');
  };
  const formatCriticalityLabel = (value?: string | null) => {
    const labelKey = getCriticalityLabelKey(value);
    if (labelKey) {
      return translation(labelKey);
    }
    return value?.trim() || translation('storeSummary.emptyValue');
  };
  const formatScenarioStatusLabel = (value?: EnvironmentScenarioStatus | null) => {
    if (!value) {
      return translation('storeSummary.emptyValue');
    }
    const key = `environmentEvidenceTable.status_${value}`;
    const translated = translation(key);
    return translated === key ? value : translated;
  };

  const clearInviteParam = useCallback(() => {
    if (!inviteParam) {
      return;
    }

    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete('invite');
    setSearchParams(nextParams, { replace: true });
  }, [inviteParam, searchParams, setSearchParams]);

  const handleOpenScenarioDetails = useCallback((scenarioId: string) => {
    setScenarioDetailsId(scenarioId);
  }, []);

  const handleCloseScenarioDetails = useCallback(() => {
    setScenarioDetailsId(null);
  }, []);

  const handleModalEvidenceSave = useCallback(async () => {
    if (!scenarioDetailsId) {
      return;
    }
    const link = modalEvidenceLink.trim();
    if (!link) {
      return;
    }

    try {
      await handleEvidenceUpload(scenarioDetailsId, link);
    } catch (error) {
      console.error(error);
    }
  }, [handleEvidenceUpload, modalEvidenceLink, scenarioDetailsId]);

  useEffect(() => {
    if (!detailScenario) {
      setModalEvidenceLink('');
      return;
    }

    setModalEvidenceLink(detailScenario.evidenciaArquivoUrl ?? '');
  }, [detailScenario]);

  useEffect(() => {
    setActiveOrganization(environmentOrganization ?? null);

    return () => {
      setActiveOrganization(null);
    };
  }, [environmentOrganization, setActiveOrganization]);

  useEffect(() => {
    if (!environment?.storeId) {
      setSuites([]);
      setScenarios([]);
      return;
    }

    let isMounted = true;

    const fetchStoreData = async () => {
      try {
        const [suitesData, scenariosData] = await Promise.all([
          storeService.listSuites(environment.storeId),
          storeService.listScenarios(environment.storeId),
        ]);

        if (isMounted) {
          setSuites(suitesData);
          setScenarios(scenariosData);
        }
      } catch (error) {
        console.error(error);
        if (isMounted) {
          setSuites([]);
          setScenarios([]);
        }
      }
    };

    void fetchStoreData();

    return () => {
      isMounted = false;
    };
  }, [environment?.storeId]);

  const { formattedTime, totalMs, formattedStart, formattedEnd } = useTimeTracking(
    environment?.timeTracking ?? null,
    environment?.status === 'in_progress',
  );

  const sendSlackSummary = useCallback(async () => {
    if (!environment || !slackWebhookUrl || isSendingSlackSummary) {
      return;
    }

    setIsSendingSlackSummary(true);

    try {
      const payload = buildSlackTaskSummaryPayload(
        environment,
        {
          formattedTime,
          totalTimeMs: totalMs,
          scenarioCount,
          executedScenariosCount,
          progressLabel,
          publicLink: shareLinks.public,
          urls,
          bugsCount: bugs.length,
          participantProfiles,
        },
        translation,
      );

      payload.webhookUrl = slackWebhookUrl;

      await slackService.sendTaskSummary(payload);
    } catch (error) {
      console.error(error);
    } finally {
      setIsSendingSlackSummary(false);
    }
  }, [
    bugs.length,
    environment,
    executedScenariosCount,
    formattedTime,
    isSendingSlackSummary,
    participantProfiles,
    progressLabel,
    scenarioCount,
    shareLinks.public,
    slackWebhookUrl,
    totalMs,
    translation,
    urls,
  ]);

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

        if (target === 'done') {
          await sendSlackSummary();
        }

        showToast({
          type: 'success',
          message:
            target === 'done'
              ? translation('environment.environmentDone')
              : translation('environment.statusUpdated'),
        });
      } catch (error) {
        if (error instanceof EnvironmentStatusError && error.code === 'PENDING_SCENARIOS') {
          showToast({
            type: 'error',
            message: translation('environment.pendingScenariosError'),
          });
          return;
        }

        console.error(error);
        showToast({ type: 'error', message: translation('environment.statusUpdateError') });
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [environment, showToast, user?.uid],
  );

  const handleCopyLink = useCallback(
    async (url: string) => {
      if (!url) {
        return;
      }

      try {
        await copyToClipboard(url);
        showToast({ type: 'success', message: translation('environment.copySuccess') });
      } catch (error) {
        console.error(error);
        showToast({ type: 'error', message: translation('environment.copyError') });
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [showToast],
  );

  const handleCopyPublicLink = useCallback(async () => {
    if (!environment) {
      return;
    }

    const shareLanguage = i18n.language ?? 'en';
    if (!environment.publicShareLanguage) {
      try {
        await environmentService.update(environment.id, {
          publicShareLanguage: shareLanguage,
        });
      } catch (error) {
        console.error(error);
      }
    }

    await handleCopyLink(shareLinks.public);
  }, [environment, handleCopyLink, i18n.language, shareLinks.public]);

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
      showToast({ type: 'success', message: translation('environment.copyMarkdownSuccess') });
    } catch (error) {
      console.error(error);
      showToast({ type: 'error', message: translation('environment.copyMarkdownError') });
    } finally {
      setIsCopyingMarkdown(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bugs, environment, participantProfiles, showToast]);

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
      showToast({ type: 'error', message: translation('environment.enterError') });
      return false;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enterEnvironment, showToast]);

  const handleLeaveEnvironment = useCallback(async () => {
    try {
      await leaveEnvironment();
      showToast({ type: 'success', message: translation('environment.leaveSuccess') });
    } catch (error) {
      console.error(error);
      showToast({ type: 'error', message: translation('environment.leaveError') });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
          <PageLoader message={translation('environment.loading')} />
        </div>
      </Layout>
    );
  }

  if (!environment) {
    return (
      <Layout>
        <section className="page-container environment-page">
          <BackButton label={translation('back')} />
          <p className="section-subtitle">{translation('environment.notFound')}</p>
        </section>
      </Layout>
    );
  }

  return (
    <Layout>
      <section className="page-container environment-page" data-testid="environment-page">
        <div className="environment-page__header">
          <div>
            <BackButton label={translation('back')} />
            <div>
              <h1 className="section-title">
                {environment.identificador ?? translation('environment.anonymousEnvironment')}
              </h1>
              <p className="section-subtitle">
                {environment.tipoAmbiente} {translation('environment.typeSeparator')}{' '}
                {environment.tipoTeste}
              </p>
              {headerMeta.length > 0 && (
                <p className="section-subtitle">
                  {headerMeta.join(` ${translation('environment.typeSeparator')} `)}
                </p>
              )}
            </div>
          </div>
          <div className="environment-actions">
            {!hasEnteredEnvironment && !isLocked ? (
              <Button
                type="button"
                onClick={handleEnterEnvironment}
                isLoading={isJoiningEnvironment}
                loadingText={translation('environment.entering')}
                data-testid="enter-environment-button"
              >
                {translation('environment.enter')}
              </Button>
            ) : (
              <>
                {environment.status === 'backlog' && (
                  <Button
                    type="button"
                    onClick={() => handleStatusTransition('in_progress')}
                    data-testid="start-environment-button"
                  >
                    {translation('environment.startExecution')}
                  </Button>
                )}
                {environment.status === 'in_progress' && (
                  <Button
                    type="button"
                    onClick={() => handleStatusTransition('done')}
                    data-testid="finish-environment-button"
                  >
                    {translation('environment.finishEnvironment')}
                  </Button>
                )}
                {hasEnteredEnvironment && environment.status !== 'done' && (
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => setIsEditOpen(true)}
                    data-testid="edit-environment-button"
                  >
                    <SettingsIcon aria-hidden className="icon" />
                    {translation('environment.manage')}
                  </Button>
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
            <h3>{translation('environment.actions.shareExport')}</h3>
            <div className="share-actions">
              {environment?.status !== 'done' && (
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => handleCopyLink(shareLinks.invite)}
                  disabled={isShareDisabled}
                  data-testid="copy-invite-button"
                >
                  <UsersGroupIcon aria-hidden className="icon" />
                  {translation('environment.share.invite')}
                </Button>
              )}
              <Button
                type="button"
                variant="secondary"
                onClick={handleCopyPublicLink}
                disabled={!canCopyPublicLink}
                data-testid="copy-public-link-button"
              >
                <LinkIcon aria-hidden className="icon" />
                {translation('environment.share.publicLink')}
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={handleExportPDF}
                disabled={isShareDisabled}
                data-testid="export-environment-pdf"
              >
                <FileTextIcon aria-hidden className="icon" />
                {translation('environment.exportPDF')}
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={handleCopyMarkdown}
                disabled={isShareDisabled}
                isLoading={isCopyingMarkdown}
                loadingText={translation('environment.copying')}
                data-testid="copy-markdown-button"
              >
                <CopyIcon aria-hidden className="icon" />
                {translation('environment.copyMarkdown')}
              </Button>
            </div>
          </div>
        </div>

        <div className="environment-evidence">
          <div className="environment-evidence__header">
            <h3 className="section-title">{translation('environment.scenarios.title')}</h3>
          </div>
          <EnvironmentEvidenceTable
            environment={environment}
            isLocked={Boolean(isScenarioLocked)}
            onViewDetails={handleOpenScenarioDetails}
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
        suites={suites}
        scenarios={scenarios}
        onDeleteRequest={() => {
          setIsEditOpen(false);
          setIsDeleteOpen(true);
        }}
        onLeave={handleLeaveEnvironment}
        canLeave={hasEnteredEnvironment && environment.status !== 'done'}
        isLeaving={isLeavingEnvironment}
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

      <Modal
        isOpen={Boolean(scenarioDetailsId)}
        onClose={handleCloseScenarioDetails}
        title={translation('storeSummary.scenarioDetailsTitle')}
      >
        {detailScenario ? (
          <div className="scenario-details">
            <p className="scenario-details-title">{detailScenario.titulo}</p>
            <div className="scenario-details-grid">
              <div className="scenario-details-item">
                <span className="scenario-details-label">
                  {translation('environmentEvidenceTable.table_categoria')}
                </span>
                <span className="scenario-details-value">
                  {detailScenario.categoria || translation('storeSummary.emptyValue')}
                </span>
              </div>
              <div className="scenario-details-item">
                <span className="scenario-details-label">
                  {translation('storeSummary.automation')}
                </span>
                <span className="scenario-details-value">
                  {formatAutomationLabel(detailScenario.automatizado)}
                </span>
              </div>
              <div className="scenario-details-item">
                <span className="scenario-details-label">
                  {translation('environmentEvidenceTable.table_criticidade')}
                </span>
                <span
                  className={`criticality-badge scenario-details-criticality ${getCriticalityClassName(
                    detailScenario.criticidade,
                  )}`}
                >
                  {formatCriticalityLabel(detailScenario.criticidade)}
                </span>
              </div>
              <div className="scenario-details-item">
                <span className="scenario-details-label">
                  {translation('environmentEvidenceTable.table_status_mobile')}
                </span>
                <span className="scenario-details-value">
                  {formatScenarioStatusLabel(detailScenarioStatus?.mobile ?? detailScenario.status)}
                </span>
              </div>
              <div className="scenario-details-item">
                <span className="scenario-details-label">
                  {translation('environmentEvidenceTable.table_status_desktop')}
                </span>
                <span className="scenario-details-value">
                  {formatScenarioStatusLabel(
                    detailScenarioStatus?.desktop ?? detailScenario.status,
                  )}
                </span>
              </div>
            </div>
            <div className="scenario-details-section">
              <span className="scenario-details-label">
                {translation('environmentEvidenceTable.table_observacao')}
              </span>
              <LinkifiedText
                text={
                  detailScenario.observacao ||
                  translation('environmentEvidenceTable.observacao_none')
                }
                className="scenario-details-text"
                as="p"
              />
            </div>
            <div className="scenario-details-section">
              <span className="scenario-details-label">{translation('storeSummary.bdd')}</span>
              <LinkifiedText
                text={translation('storeSummary.emptyValue')}
                className="scenario-details-text"
                as="p"
              />
            </div>
            <div className="scenario-details-section">
              <span className="scenario-details-label">
                {translation('environmentEvidenceTable.table_evidencia')}
              </span>
              {detailScenario.evidenciaArquivoUrl ? (
                <a
                  href={detailScenario.evidenciaArquivoUrl}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="text-link"
                >
                  {translation('environmentEvidenceTable.evidencia_abrir')}
                </a>
              ) : isDetailScenarioRunning && !isScenarioLocked ? (
                <div className="scenario-evidence-actions">
                  <input
                    type="url"
                    value={modalEvidenceLink}
                    onChange={(event) => setModalEvidenceLink(event.target.value)}
                    placeholder={translation('environmentEvidenceTable.evidencia_placeholder')}
                    className="scenario-evidence-input"
                  />
                  <Button
                    type="button"
                    onClick={handleModalEvidenceSave}
                    isLoading={isUpdatingEvidence}
                    loadingText={translation('saving')}
                  >
                    {translation('environmentEvidenceTable.evidencia_salvar')}
                  </Button>
                </div>
              ) : (
                <span className="section-subtitle">
                  {translation('environmentEvidenceTable.evidencia_sem')}
                </span>
              )}
            </div>
            <div className="scenario-details-section">
              <span className="scenario-details-label">
                {translation('environmentEvidenceTable.table_bug')}
              </span>
              <div className="scenario-bug-cell">
                <span className="scenario-bug-cell__label">
                  {(() => {
                    const count = bugCountByScenario?.[scenarioDetailsId as string] ?? 0;
                    if (count === 0) {
                      return translation('environmentEvidenceTable.bug_nenhum');
                    }
                    if (count === 1) {
                      return translation('environmentEvidenceTable.bug_um');
                    }
                    return translation('environmentEvidenceTable.bug_varios', { count });
                  })()}
                </span>
                {!isInteractionLocked && (
                  <button
                    type="button"
                    className="scenario-bug-cell__action"
                    onClick={() => handleScenarioBugRequest(scenarioDetailsId as string)}
                  >
                    {translation('environmentEvidenceTable.bug_registrar')}
                  </button>
                )}
              </div>
            </div>
          </div>
        ) : (
          <p className="section-subtitle">{translation('storeSummary.emptyValue')}</p>
        )}
      </Modal>
    </Layout>
  );
};
