import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
import { environmentService } from '../../infrastructure/services/environmentService';
import { storeService } from '../../infrastructure/services/storeService';
import { slackService } from '../../infrastructure/services/slackService';
import { BackButton } from '../components/BackButton';
import { Button } from '../components/Button';
import { TextInput } from '../components/TextInput';
import { Layout } from '../components/Layout';
import { UserAvatar } from '../components/UserAvatar';
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
import {
  getEnvironmentColumns,
  getScenarioPlatformStatuses,
} from '../../infrastructure/external/environments';
import {
  getAutomationLabelKey,
  getCriticalityClassName,
  getCriticalityLabelKey,
} from '../constants/scenarioOptions';
import {
  CopyIcon,
  FileTextIcon,
  LinkIcon,
  LogoutIcon,
  SettingsIcon,
  TrashIcon,
  UsersGroupIcon,
} from '../components/icons';
import { exportEnvironmentExcel } from '../../utils/exportExcel';
import {
  BUG_PRIORITY_LABEL,
  BUG_SEVERITY_LABEL,
  ENVIRONMENT_STATUS_LABEL,
} from '../../shared/config/environmentLabels';

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
  const normalizedEnvironmentType =
    typeof environment.tipoAmbiente === 'string'
      ? environment.tipoAmbiente.trim().toUpperCase()
      : '';
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
      ? attendeeList.map((attendee) =>
          typeof attendee === 'string'
            ? `• ${attendee}`
            : `• ${attendee.name ?? ''} (${attendee.email ?? ''})`,
        )
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
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [isInvitingUserId, setIsInvitingUserId] = useState<string | null>(null);
  const [inviteSearch, setInviteSearch] = useState('');
  const [invitePage, setInvitePage] = useState(1);
  const [isBugModalOpen, setIsBugModalOpen] = useState(false);
  const [editingBug, setEditingBug] = useState<EnvironmentBug | null>(null);
  const [defaultBugScenarioId, setDefaultBugScenarioId] = useState<string | null>(null);
  const [scenarioDetailsId, setScenarioDetailsId] = useState<string | null>(null);
  const [isSendingSlackSummary, setIsSendingSlackSummary] = useState(false);
  const [suites, setSuites] = useState<StoreSuite[]>([]);
  const [scenarios, setScenarios] = useState<StoreScenario[]>([]);
  const [storeName, setStoreName] = useState<string>('');
  const [storeSlackWebhookUrl, setStoreSlackWebhookUrl] = useState<string | null>(null);
  const { setActiveOrganization, setActiveStore } = useOrganizationBranding();
  const participantProfiles = useUserProfiles(environment?.participants ?? []);
  const activeOrganizationIdRef = useRef<string | null>(null);
  const {
    bugs,
    isLoading: isLoadingBugs,
    refetch: refetchBugs,
  } = useEnvironmentBugs(environment?.id ?? null);
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
  const { t: translation, i18n } = useTranslation();
  const {
    bugCountByScenario,
    progressLabel,
    scenarioCount,
    executedScenariosCount,
    urls,
    shareLinks,
  } = useEnvironmentDetails(environment, bugs);
  const slackWebhookUrl =
    storeSlackWebhookUrl?.trim() || environmentOrganization?.slackWebhookUrl?.trim() || null;
  const inviteParam = searchParams.get('invite');
  const shouldAutoJoinFromInvite = inviteParam === 'true' || inviteParam === '1';
  const detailScenario = scenarioDetailsId ? environment?.scenarios?.[scenarioDetailsId] : null;
  const filteredInviteMembers = useMemo(() => {
    const members = environmentOrganization?.members ?? [];
    const query = inviteSearch.trim().toLowerCase();
    if (!query) {
      return members;
    }
    return members.filter((member) =>
      `${member.displayName ?? ''} ${member.email}`.toLowerCase().includes(query),
    );
  }, [environmentOrganization?.members, inviteSearch]);
  const invitePageSize = 5;
  const totalInvitePages = Math.max(1, Math.ceil(filteredInviteMembers.length / invitePageSize));
  const paginatedInviteMembers = filteredInviteMembers.slice(
    (invitePage - 1) * invitePageSize,
    invitePage * invitePageSize,
  );
  const detailScenarioStatus =
    detailScenario && environment
      ? getScenarioPlatformStatuses(detailScenario, getEnvironmentColumns(environment))
      : null;
  const formatAutomationLabel = (value?: string | null) => {
    const labelKey = getAutomationLabelKey(value);
    if (labelKey) {
      return translation(labelKey);
    }
    return value?.trim() || translation('storeSummary.emptyValue');
  };
  const formatCriticalityLabel = useCallback(
    (value?: string | null) => {
      const labelKey = getCriticalityLabelKey(value);
      if (labelKey) {
        return translation(labelKey);
      }
      return value?.trim() || translation('storeSummary.emptyValue');
    },
    [translation],
  );
  const formatScenarioStatusLabel = useCallback(
    (value?: EnvironmentScenarioStatus | null) => {
      if (!value) {
        return translation('storeSummary.emptyValue');
      }
      const key = `environmentEvidenceTable.status_${value}`;
      const translated = translation(key);
      return translated === key ? value : translated;
    },
    [translation],
  );
  const translateOptionValue = useCallback(
    (value?: string | null) => {
      if (!value) {
        return translation('storeSummary.emptyValue');
      }
      const translated = translation(value);
      return translated === value ? value : translated;
    },
    [translation],
  );

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

  const handleInviteParticipant = useCallback(
    async (userId: string) => {
      if (!environment) {
        return;
      }
      try {
        setIsInvitingUserId(userId);
        await environmentService.addUser(environment.id, userId);
        showToast({ type: 'success', message: translation('environment.inviteSent') });
      } catch (error) {
        console.error(error);
        showToast({ type: 'error', message: translation('environment.inviteError') });
      } finally {
        setIsInvitingUserId(null);
      }
    },
    [environment, showToast, translation],
  );

  useEffect(() => {
    const nextOrganizationId = environmentOrganization?.id ?? null;
    if (activeOrganizationIdRef.current === nextOrganizationId) {
      return;
    }
    activeOrganizationIdRef.current = nextOrganizationId;
    setActiveOrganization(environmentOrganization ?? null);

    return () => {
      setActiveStore(null);
    };
  }, [environmentOrganization, setActiveOrganization, setActiveStore]);

  useEffect(() => {
    if (!environment?.storeId || !isEditOpen) {
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
  }, [environment?.storeId, isEditOpen]);

  useEffect(() => {
    if (!environment?.storeId) {
      setStoreName('');
      setStoreSlackWebhookUrl(null);
      setActiveStore(null);
      return;
    }

    let isMounted = true;

    const fetchStoreName = async () => {
      try {
        const store = await storeService.getDetail(environment.storeId);
        if (isMounted) {
          const resolvedStoreName = store?.name?.trim() || '';
          const resolvedStoreLogoUrl = store?.logoUrl ?? null;
          setStoreName(resolvedStoreName);
          setStoreSlackWebhookUrl(store?.slackWebhookUrl ?? null);
          setActiveStore(
            store
              ? {
                  id: store.id,
                  name: resolvedStoreName,
                  logoUrl: resolvedStoreLogoUrl,
                }
              : null,
          );
        }
      } catch (error) {
        console.error(error);
        if (isMounted) {
          setStoreName('');
          setStoreSlackWebhookUrl(null);
          setActiveStore(null);
        }
      }
    };

    void fetchStoreName();

    return () => {
      isMounted = false;
    };
  }, [environment?.storeId, setActiveStore]);

  const { formattedTime, totalMs, formattedStart, formattedEnd } = useTimeTracking(
    environment?.timeTracking ?? null,
    environment?.status === 'in_progress',
    {
      translation,
      locale: i18n.language,
    },
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
    bugs,
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
    [environment, sendSlackSummary, showToast, translation, user?.uid],
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
    [showToast, translation],
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

  const handleExportExcel = useCallback(() => {
    if (!environment) {
      return;
    }
    const environmentColumns = getEnvironmentColumns(environment);

    const rows = Object.values(environment.scenarios ?? {}).map((scenario) => {
      const statuses = getScenarioPlatformStatuses(scenario, environmentColumns);
      const observation =
        scenario.observacao?.trim() || translation('environmentEvidenceTable.observacao_none');

      return {
        titulo: scenario.titulo || translation('storeSummary.emptyValue'),
        categoria: scenario.categoria || translation('storeSummary.emptyValue'),
        criticidade: formatCriticalityLabel(scenario.criticidade),
        observacao: observation,
        statuses: environmentColumns.map((column) => formatScenarioStatusLabel(statuses[column])),
      };
    });

    const normalizedStoreName = storeName ? storeName.replace(/\s+/g, '_') : '';
    const storePrefix = normalizedStoreName ? `${normalizedStoreName}_` : '';
    const fileName = `${storePrefix}${translation('environment.exportExcelFileName')}-${environment.identificador}-${new Date().toISOString().slice(0, 10)}.xlsx`;
    const infoRows = [
      {
        label: translation('editEnvironmentModal.identifier'),
        value: environment.identificador || translation('storeSummary.emptyValue'),
      },
      {
        label: translation('storeSummary.storeName'),
        value: storeName || translation('storeSummary.emptyValue'),
      },
      {
        label: translation('environment.exportExcelStatusLabel'),
        value: translation(ENVIRONMENT_STATUS_LABEL[environment.status]),
      },
      {
        label: translation('createEnvironment.suiteId'),
        value: environment.suiteName?.trim() || translation('storeSummary.emptyValue'),
      },
      {
        label: translation('editEnvironmentModal.environmentType'),
        value: translateOptionValue(environment.tipoAmbiente),
      },
      {
        label: translation('editEnvironmentModal.testType'),
        value: translateOptionValue(environment.tipoTeste),
      },
      {
        label: translation('editEnvironmentModal.moment'),
        value: environment.momento
          ? translateOptionValue(environment.momento)
          : translation('environmentSummary.notRecorded'),
      },
      {
        label: translation('editEnvironmentModal.release'),
        value: environment.release?.trim() || translation('environmentSummary.notRecorded'),
      },
      {
        label: translation('editEnvironmentModal.jiraTask'),
        value: environment.jiraTask?.trim() || translation('environmentSummary.notInformed'),
      },
      {
        label: translation('editEnvironmentModal.urls'),
        value: urls.length > 0 ? urls.join('\n') : translation('environmentSummary.noUrls'),
      },
      {
        label: translation('environmentSummary.participants'),
        value:
          participantProfiles.length > 0
            ? participantProfiles
                .map((profile) => profile.displayName?.trim() || profile.email)
                .filter(Boolean)
                .join(', ')
            : translation('environmentSummary.noParticipants'),
      },
      {
        label: translation('environmentSummary.scenarios'),
        value: `${executedScenariosCount}/${scenarioCount}`,
      },
      {
        label: translation('environmentSummary.bugs'),
        value: String(bugs.length),
      },
      {
        label: translation('environmentSummary.start'),
        value: formattedStart,
      },
      {
        label: translation('environmentSummary.end'),
        value: formattedEnd,
      },
      {
        label: translation('environmentSummary.totalTime'),
        value: formattedTime || '00:00:00',
      },
    ];
    const bugRows = bugs.map((bug) => {
      const scenarioName = bug.scenarioId
        ? environment.scenarios?.[bug.scenarioId]?.titulo ||
          translation('environmentBugList.scenarioRemoved')
        : translation('environmentBugList.notLinked');

      return {
        cenario: scenarioName,
        severidade: bug.severity
          ? translation(BUG_SEVERITY_LABEL[bug.severity])
          : translation('environmentBugList.noSeverity'),
        prioridade: bug.priority
          ? translation(BUG_PRIORITY_LABEL[bug.priority])
          : translation('environmentBugList.noPriority'),
        resultadoAtual:
          bug.actualResult?.trim() || translation('environmentBugList.noActualResult'),
      };
    });

    exportEnvironmentExcel({
      fileName,
      scenarioSheetName: translation('environment.exportExcelSheetName'),
      environmentSheetName: translation('environment.exportExcelEnvironmentSheetName'),
      bugSheetName: translation('environment.exportExcelBugsSheetName'),
      infoHeaderLabels: [translation('exportExcel.field'), translation('exportExcel.value')],
      infoRows,
      scenarioRows: rows,
      scenarioHeaderLabels: [
        translation('environmentEvidenceTable.table_titulo'),
        translation('environmentEvidenceTable.table_categoria'),
        translation('environmentEvidenceTable.table_criticidade'),
        translation('environmentEvidenceTable.table_observacao'),
        ...environmentColumns,
      ],
      bugRows,
      bugHeaderLabels: [
        translation('environmentBugList.scenario'),
        translation('environmentBugList.severity'),
        translation('environmentBugList.priority'),
        translation('environmentBugList.actualResult'),
      ],
    });
  }, [
    bugs,
    environment,
    executedScenariosCount,
    formatCriticalityLabel,
    formatScenarioStatusLabel,
    formattedEnd,
    formattedStart,
    formattedTime,
    participantProfiles,
    scenarioCount,
    storeName,
    translateOptionValue,
    translation,
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
      showToast({ type: 'error', message: translation('environment.enterError') });
      return false;
    }
  }, [enterEnvironment, showToast, translation]);

  const handleLeaveEnvironment = useCallback(async () => {
    try {
      await leaveEnvironment();
      showToast({ type: 'success', message: translation('environment.leaveSuccess') });
      navigate(-1);
    } catch (error) {
      console.error(error);
      showToast({ type: 'error', message: translation('environment.leaveError') });
    }
  }, [leaveEnvironment, navigate, showToast, translation]);

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
      showToast({ type: 'success', message: translation('environment.inviteReceived') });
      clearInviteParam();
    };

    void attemptAutoJoin();
  }, [
    clearInviteParam,
    handleEnterEnvironment,
    hasEnteredEnvironment,
    isLocked,
    showToast,
    shouldAutoJoinFromInvite,
    translation,
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
        <div className="environment-toolbar">
          <BackButton label={translation('back')} />
          <div className="environment-actions">
            {!hasEnteredEnvironment && !isLocked && (
              <Button
                type="button"
                onClick={handleEnterEnvironment}
                isLoading={isJoiningEnvironment}
                loadingText={translation('environment.entering')}
                data-testid="enter-environment-button"
              >
                {translation('environment.enter')}
              </Button>
            )}
            {environment.status === 'backlog' && hasEnteredEnvironment && (
              <Button
                type="button"
                onClick={() => handleStatusTransition('in_progress')}
                data-testid="start-environment-button"
              >
                {translation('environment.startExecution')}
              </Button>
            )}
            {environment.status === 'in_progress' && hasEnteredEnvironment && (
              <Button
                type="button"
                onClick={() => handleStatusTransition('done')}
                data-testid="finish-environment-button"
              >
                {translation('environment.finishEnvironment')}
              </Button>
            )}
            {hasEnteredEnvironment && (
              <Button
                type="button"
                variant="ghost"
                onClick={handleLeaveEnvironment}
                isLoading={isLeavingEnvironment}
                loadingText={translation('environment.leaving')}
              >
                <LogoutIcon aria-hidden className="icon" />
                {translation('environment.leave')}
              </Button>
            )}
            {environment.status === 'done' ? (
              <Button
                type="button"
                variant="ghost"
                onClick={() => setIsDeleteOpen(true)}
                data-testid="delete-environment-button"
              >
                <TrashIcon aria-hidden className="icon" />
                {translation('deleteEnvironmentModal.deleteEnvironment')}
              </Button>
            ) : (
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
          </div>
        </div>

        <div className="environment-summary-grid">
          <EnvironmentSummaryCard
            environment={environment}
            scenarioCount={scenarioCount}
            urls={urls}
            participants={participantProfiles}
            bugsCount={bugs.length}
            storeName={storeName}
          />
          <div className="summary-card">
            <h3>{translation('environment.actions.shareExport')}</h3>
            <div className="share-actions">
              {environment?.status !== 'done' && (
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => {
                    setInvitePage(1);
                    setInviteSearch('');
                    setIsInviteModalOpen(true);
                  }}
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
                onClick={handleExportExcel}
                disabled={isShareDisabled}
                data-testid="export-environment-excel"
              >
                <FileTextIcon aria-hidden className="icon" />
                {translation('environment.exportExcel')}
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
          />
        </div>

        <EnvironmentBugList
          environment={environment}
          bugs={bugs}
          participants={participantProfiles}
          isLocked={Boolean(isInteractionLocked)}
          isLoading={isLoadingBugs}
          onEdit={handleEditBug}
          onRefresh={refetchBugs}
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
          onSaved={refetchBugs}
        />
      )}

      <Modal
        isOpen={isInviteModalOpen}
        onClose={() => setIsInviteModalOpen(false)}
        title={translation('environment.share.invite')}
        description={translation('environment.participantsDescription')}
      >
        <div className="form-grid">
          <TextInput
            id="invite-search"
            label={translation('environment.inviteSearch')}
            value={inviteSearch}
            onChange={(event) => {
              setInviteSearch(event.target.value);
              setInvitePage(1);
            }}
            placeholder={translation('environment.inviteSearchPlaceholder')}
          />
          <Button
            type="button"
            variant="ghost"
            onClick={() => handleCopyLink(shareLinks.invite)}
            disabled={isShareDisabled}
          >
            <CopyIcon aria-hidden className="icon" />
            {translation('environment.copyInviteLink')}
          </Button>
          {paginatedInviteMembers.map((member) => {
            const alreadyParticipant = (environment.participants ?? []).includes(member.uid);
            return (
              <div key={member.uid} className="collaborator-card">
                <div className="flex items-center gap-2">
                  <UserAvatar
                    name={member.displayName || member.email}
                    photoUrl={member.photoURL ?? null}
                    size="sm"
                  />
                  <div className="collaborator-card__details">
                    <strong>{member.displayName || member.email}</strong>
                    <span>{member.email}</span>
                  </div>
                </div>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => handleInviteParticipant(member.uid)}
                  disabled={alreadyParticipant || isInvitingUserId === member.uid}
                  isLoading={isInvitingUserId === member.uid}
                >
                  {alreadyParticipant
                    ? translation('environment.invited')
                    : translation('environment.inviteAction')}
                </Button>
              </div>
            );
          })}
          {filteredInviteMembers.length > invitePageSize && (
            <div className="modal-actions">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setInvitePage((current) => Math.max(1, current - 1))}
                disabled={invitePage === 1}
              >
                {translation('environment.previousPage')}
              </Button>
              <span>
                {invitePage}/{totalInvitePages}
              </span>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setInvitePage((current) => Math.min(totalInvitePages, current + 1))}
                disabled={invitePage === totalInvitePages}
              >
                {translation('environment.nextPage')}
              </Button>
            </div>
          )}
        </div>
      </Modal>

      <Modal
        isOpen={Boolean(scenarioDetailsId)}
        onClose={handleCloseScenarioDetails}
        title={translation('storeSummary.scenarioDetailsTitle')}
        bodyClassName="scenario-details"
      >
        {detailScenario ? (
          <>
            <p className="scenario-details-title">{detailScenario.titulo}</p>
            <div className="scenario-details-items">
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
              {Object.entries(detailScenarioStatus ?? {}).map(([column, status]) => (
                <div className="scenario-details-item" key={column}>
                  <span className="scenario-details-label">{column}</span>
                  <span className="scenario-details-value">
                    {formatScenarioStatusLabel(status)}
                  </span>
                </div>
              ))}
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
          </>
        ) : (
          <p className="section-subtitle">{translation('storeSummary.emptyValue')}</p>
        )}
      </Modal>
    </Layout>
  );
};
