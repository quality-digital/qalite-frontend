import {
  Timestamp,
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  query,
  runTransaction,
  serverTimestamp,
  updateDoc,
  where,
  type QueryConstraint,
} from 'firebase/firestore';

import type { ActivityLog } from '../../domain/entities/activityLog';
import type {
  CreateEnvironmentBugInput,
  CreateEnvironmentInput,
  Environment,
  EnvironmentBug,
  EnvironmentBugStatus,
  EnvironmentRealtimeFilters,
  EnvironmentScenario,
  EnvironmentScenarioPlatform,
  EnvironmentScenarioStatus,
  EnvironmentStatus,
  EnvironmentTimeTracking,
  UpdateEnvironmentBugInput,
  UpdateEnvironmentInput,
} from '../../domain/entities/environment';
import type { UserSummary } from '../../domain/entities/user';
import { firebaseFirestore } from '../database/firebase';
import { EnvironmentStatusError } from '../../shared/errors/firebaseErrors';
import { BUG_STATUS_LABEL, ENVIRONMENT_STATUS_LABEL } from '../../shared/config/environmentLabels';
import { logActivity } from './logs';
import {
  formatDateTime,
  formatDurationFromMs,
  formatEndDateTime,
  getElapsedMilliseconds,
} from '../../shared/utils/time';
import { translateEnvironmentOption } from '../../shared/utils/environmentOptions';
import i18n from '../../lib/i18n';
import { normalizeCriticalityEnum } from '../../shared/utils/scenarioEnums';

const ENVIRONMENTS_COLLECTION = 'environments';
const BUGS_SUBCOLLECTION = 'bugs';
const STORES_COLLECTION = 'stores';
const environmentsCollection = collection(firebaseFirestore, ENVIRONMENTS_COLLECTION);

const getStoreOrganizationContext = async (
  storeId: string,
): Promise<{ organizationId: string | null; storeName: string }> => {
  const storeRef = doc(firebaseFirestore, STORES_COLLECTION, storeId);
  const snapshot = await getDoc(storeRef);

  if (!snapshot.exists()) {
    return { organizationId: null, storeName: '' };
  }

  const data = snapshot.data();
  return {
    organizationId: (data.organizationId as string | undefined | null) ?? null,
    storeName: (data.name as string | undefined) ?? '',
  };
};

const logEnvironmentActivity = async (
  storeId: string,
  environmentId: string,
  action: ActivityLog['action'],
  message: string,
  entityType: ActivityLog['entityType'] = 'environment',
): Promise<void> => {
  const context = await getStoreOrganizationContext(storeId);
  if (!context.organizationId) {
    return;
  }

  await logActivity({
    organizationId: context.organizationId,
    entityId: environmentId,
    entityType,
    action,
    message: `${message} (${context.storeName || 'Loja'})`,
  });
};

export const SCENARIO_COMPLETED_STATUSES: EnvironmentScenarioStatus[] = [
  'concluido',
  'concluido_automatizado',
  'nao_se_aplica',
];

export const getScenarioPlatformStatuses = (
  scenario: EnvironmentScenario,
): Record<EnvironmentScenarioPlatform, EnvironmentScenarioStatus> => ({
  mobile: scenario.statusMobile ?? scenario.status,
  desktop: scenario.statusDesktop ?? scenario.status,
});

const getString = (value: unknown, fallback = ''): string =>
  typeof value === 'string' ? value : fallback;
const getStringOrNull = (value: unknown): string | null =>
  typeof value === 'string' ? value : null;
const getStringArray = (value: unknown): string[] =>
  Array.isArray(value)
    ? value.filter((entry): entry is string => typeof entry === 'string' && entry.length > 0)
    : [];
const parseTimestamp = (value: Timestamp | string | null | undefined): string | null => {
  if (!value) {
    return null;
  }

  if (value instanceof Timestamp) {
    return value.toDate().toISOString();
  }

  return typeof value === 'string' ? value : null;
};
const parseScenarioMap = (
  data: Record<string, unknown> | undefined,
): Record<string, EnvironmentScenario> => {
  if (!data) {
    return {};
  }

  return Object.entries(data).reduce<Record<string, EnvironmentScenario>>((acc, [id, value]) => {
    if (typeof value !== 'object' || value === null) {
      acc[id] = {
        titulo: '',
        categoria: '',
        criticidade: '',
        observacao: '',
        status: 'pendente',
        evidenciaArquivoUrl: null,
      };
      return acc;
    }

    const entry = value as Record<string, unknown>;
    const defaultStatus = (entry.status ?? 'pendente') as EnvironmentScenarioStatus;
    const mobileStatus = (entry.statusMobile ??
      entry.mobileStatus ??
      defaultStatus) as EnvironmentScenarioStatus;
    const desktopStatus = (entry.statusDesktop ??
      entry.desktopStatus ??
      defaultStatus) as EnvironmentScenarioStatus;
    const automation = getString(entry.automatizado ?? entry.automation);
    acc[id] = {
      titulo: getString(entry.titulo),
      categoria: getString(entry.categoria),
      criticidade: getString(entry.criticidade),
      observacao: getString(entry.observacao ?? entry.observation),
      automatizado: automation,
      status: defaultStatus,
      statusMobile: mobileStatus,
      statusDesktop: desktopStatus,
      evidenciaArquivoUrl: getStringOrNull(entry.evidenciaArquivoUrl),
    };
    return acc;
  }, {});
};

const getBugCollection = (environmentId: string) =>
  collection(firebaseFirestore, ENVIRONMENTS_COLLECTION, environmentId, BUGS_SUBCOLLECTION);

const normalizeBug = (id: string, data: Record<string, unknown>): EnvironmentBug => ({
  id,
  scenarioId: getStringOrNull(data.scenarioId ?? data.scenario),
  title: getString(data.title ?? data.titulo),
  description: getStringOrNull(data.description ?? data.descricao),
  status: (data.status ?? 'aberto') as EnvironmentBugStatus,
  createdAt: parseTimestamp(data.createdAt as Timestamp | string | null | undefined),
  updatedAt: parseTimestamp(data.updatedAt as Timestamp | string | null | undefined),
});

const normalizeEnvironment = (id: string, data: Record<string, unknown>): Environment => ({
  id,
  identificador: getString(data.identificador),
  storeId: getString(data.storeId ?? data.loja),
  suiteId: getStringOrNull(data.suiteId ?? data.suite),
  suiteName: getStringOrNull(data.suiteName ?? data.nomeSuite),
  urls: getStringArray(data.urls),
  jiraTask: getString(data.jiraTask),
  tipoAmbiente: getString(data.tipoAmbiente),
  tipoTeste: getString(data.tipoTeste),
  momento: getStringOrNull(data.momento),
  release: getStringOrNull(data.release),
  status: (data.status ?? 'backlog') as EnvironmentStatus,
  createdAt: parseTimestamp(data.createdAt as Timestamp | string | null | undefined) ?? null,
  updatedAt: parseTimestamp(data.updatedAt as Timestamp | string | null | undefined) ?? null,
  timeTracking: {
    start: parseTimestamp(
      (data.timeTracking as Record<string, unknown> | undefined)?.start as
        | Timestamp
        | string
        | null
        | undefined,
    ),
    end: parseTimestamp(
      (data.timeTracking as Record<string, unknown> | undefined)?.end as
        | Timestamp
        | string
        | null
        | undefined,
    ),
    totalMs: Number(
      typeof (data.timeTracking as Record<string, unknown> | undefined)?.totalMs === 'number'
        ? (data.timeTracking as Record<string, unknown>).totalMs
        : ((data.timeTracking as Record<string, unknown> | undefined)?.totalMs ?? 0),
    ),
  },
  presentUsersIds: getStringArray(data.presentUsersIds),
  concludedBy: getStringOrNull(data.concludedBy),
  scenarios: parseScenarioMap(data.scenarios as Record<string, unknown> | undefined),
  bugs: Number(data.bugs ?? 0),
  totalCenarios: Number(data.totalCenarios ?? 0),
  participants: getStringArray(data.participants),
  publicShareLanguage: getStringOrNull(data.publicShareLanguage),
});

export const createEnvironment = async (payload: CreateEnvironmentInput): Promise<Environment> => {
  const docRef = await addDoc(environmentsCollection, {
    ...payload,
    loja: payload.storeId,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  const snapshot = await getDoc(docRef);
  const environment = normalizeEnvironment(
    snapshot.id,
    (snapshot.data() ?? {}) as Record<string, unknown>,
  );

  await logEnvironmentActivity(
    environment.storeId,
    environment.id,
    'create',
    `Ambiente criado: ${environment.identificador || environment.id}`,
  );

  return environment;
};

export const updateEnvironment = async (
  environmentId: string,
  payload: UpdateEnvironmentInput,
): Promise<void> => {
  const environmentRef = doc(firebaseFirestore, ENVIRONMENTS_COLLECTION, environmentId);
  const data: Record<string, unknown> = {
    ...payload,
    updatedAt: serverTimestamp(),
  };

  if (payload.storeId) {
    data.loja = payload.storeId;
  }

  await updateDoc(environmentRef, data);

  const snapshot = await getDoc(environmentRef);
  if (snapshot.exists()) {
    const environment = normalizeEnvironment(
      environmentId,
      (snapshot.data() ?? {}) as Record<string, unknown>,
    );
    await logEnvironmentActivity(
      environment.storeId,
      environmentId,
      'update',
      `Ambiente atualizado: ${environment.identificador || environmentId}`,
    );
  }
};

export const deleteEnvironment = async (environmentId: string): Promise<void> => {
  const environmentRef = doc(firebaseFirestore, ENVIRONMENTS_COLLECTION, environmentId);
  const snapshot = await getDoc(environmentRef);

  await deleteDoc(environmentRef);

  if (snapshot.exists()) {
    const environment = normalizeEnvironment(
      environmentId,
      (snapshot.data() ?? {}) as Record<string, unknown>,
    );
    await logEnvironmentActivity(
      environment.storeId,
      environmentId,
      'delete',
      `Ambiente removido: ${environment.identificador || environmentId}`,
    );
  }
};

export const observeEnvironment = (
  environmentId: string,
  callback: (environment: Environment | null) => void,
): (() => void) => {
  const environmentRef = doc(firebaseFirestore, ENVIRONMENTS_COLLECTION, environmentId);
  return onSnapshot(environmentRef, (snapshot) => {
    if (!snapshot.exists()) {
      callback(null);
      return;
    }

    callback(normalizeEnvironment(snapshot.id, snapshot.data() ?? {}));
  });
};

export const observeEnvironments = (
  filters: EnvironmentRealtimeFilters,
  callback: (environments: Environment[]) => void,
): (() => void) => {
  const constraints: QueryConstraint[] = [];

  if (filters.storeId) {
    constraints.push(where('loja', '==', filters.storeId));
  }

  const environmentsQuery =
    constraints.length > 0 ? query(environmentsCollection, ...constraints) : environmentsCollection;

  return onSnapshot(environmentsQuery, (snapshot) => {
    const list = snapshot.docs
      .map((docSnapshot) => normalizeEnvironment(docSnapshot.id, docSnapshot.data() ?? {}))
      .sort((a, b) => {
        const aDate = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const bDate = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return bDate - aDate;
      });

    callback(list);
  });
};

export const addEnvironmentUser = async (environmentId: string, userId: string): Promise<void> => {
  const environmentRef = doc(firebaseFirestore, ENVIRONMENTS_COLLECTION, environmentId);
  let environmentData: Record<string, unknown> | null = null;
  await runTransaction(firebaseFirestore, async (transaction) => {
    const snapshot = await transaction.get(environmentRef);
    if (!snapshot.exists()) {
      throw new Error('Ambiente não encontrado.');
    }

    const data = snapshot.data();
    environmentData = data;
    if (data.status === 'done') {
      throw new Error('Ambiente já concluído.');
    }

    const presentUsers: string[] = data.presentUsersIds ?? [];
    const participants: string[] = data.participants ?? [];

    if (presentUsers.includes(userId)) {
      return;
    }

    transaction.update(environmentRef, {
      presentUsersIds: [...presentUsers, userId],
      participants: participants.includes(userId) ? participants : [...participants, userId],
      updatedAt: serverTimestamp(),
    });
  });

  const environmentDetails = environmentData as Record<string, unknown> | null;
  const storeId =
    environmentDetails && typeof environmentDetails.storeId === 'string'
      ? (environmentDetails.storeId as string)
      : '';
  const environmentIdentifier =
    environmentDetails && typeof environmentDetails.identificador === 'string'
      ? (environmentDetails.identificador as string)
      : environmentId;

  if (storeId) {
    await logEnvironmentActivity(
      storeId,
      environmentId,
      'participation',
      `Participante adicionado ao ambiente (${environmentIdentifier})`,
      'environment_participant',
    );
  }
};

export const removeEnvironmentUser = async (
  environmentId: string,
  userId: string,
): Promise<void> => {
  const environmentRef = doc(firebaseFirestore, ENVIRONMENTS_COLLECTION, environmentId);
  let environmentData: Record<string, unknown> | null = null;
  await runTransaction(firebaseFirestore, async (transaction) => {
    const snapshot = await transaction.get(environmentRef);
    if (!snapshot.exists()) {
      return;
    }

    const data = snapshot.data();
    environmentData = data;
    if (data?.status === 'done') {
      throw new Error('Não é possível sair de um ambiente concluído.');
    }

    const presentUsers: string[] = data?.presentUsersIds ?? [];
    const participants: string[] = data?.participants ?? [];
    if (!presentUsers.includes(userId)) {
      return;
    }

    transaction.update(environmentRef, {
      presentUsersIds: presentUsers.filter((id) => id !== userId),
      participants: participants.filter((id) => id !== userId),
      updatedAt: serverTimestamp(),
    });
  });

  const environmentDetails = environmentData as Record<string, unknown> | null;
  const storeId =
    environmentDetails && typeof environmentDetails.storeId === 'string'
      ? (environmentDetails.storeId as string)
      : '';
  const environmentIdentifier =
    environmentDetails && typeof environmentDetails.identificador === 'string'
      ? (environmentDetails.identificador as string)
      : environmentId;

  if (storeId) {
    await logEnvironmentActivity(
      storeId,
      environmentId,
      'participation',
      `Participante removido do ambiente (${environmentIdentifier})`,
      'environment_participant',
    );
  }
};

const updateScenarioField = async (
  environmentId: string,
  scenarioId: string,
  updates: Record<string, unknown>,
) => {
  const environmentRef = doc(firebaseFirestore, ENVIRONMENTS_COLLECTION, environmentId);
  await updateDoc(environmentRef, {
    ...Object.entries(updates).reduce<Record<string, unknown>>((acc, [key, value]) => {
      acc[`scenarios.${scenarioId}.${key}`] = value;
      return acc;
    }, {}),
    updatedAt: serverTimestamp(),
  });
};

export const updateScenarioStatus = async (
  environmentId: string,
  scenarioId: string,
  status: EnvironmentScenarioStatus,
  platform?: EnvironmentScenarioPlatform,
): Promise<void> => {
  const environmentRef = doc(firebaseFirestore, ENVIRONMENTS_COLLECTION, environmentId);
  const snapshot = await getDoc(environmentRef);
  const environment = snapshot.exists()
    ? normalizeEnvironment(environmentId, (snapshot.data() ?? {}) as Record<string, unknown>)
    : null;

  if (platform === 'mobile') {
    await updateScenarioField(environmentId, scenarioId, { statusMobile: status });
    if (environment) {
      await logEnvironmentActivity(
        environment.storeId,
        environmentId,
        'status_change',
        `Status do cenário atualizado (mobile): ${status} - ${environment.identificador || environmentId}`,
      );
    }
    return;
  }

  if (platform === 'desktop') {
    await updateScenarioField(environmentId, scenarioId, { statusDesktop: status });
    if (environment) {
      await logEnvironmentActivity(
        environment.storeId,
        environmentId,
        'status_change',
        `Status do cenário atualizado (desktop): ${status} - ${environment.identificador || environmentId}`,
      );
    }
    return;
  }

  await updateScenarioField(environmentId, scenarioId, { status });
  if (environment) {
    await logEnvironmentActivity(
      environment.storeId,
      environmentId,
      'status_change',
      `Status do cenário atualizado: ${status} - ${environment.identificador || environmentId}`,
    );
  }
};

export const uploadScenarioEvidence = async (
  environmentId: string,
  scenarioId: string,
  evidenceLink: string,
): Promise<string> => {
  const trimmedLink = evidenceLink.trim();
  if (!trimmedLink) {
    throw new Error('Informe um link válido para a evidência.');
  }

  try {
    const parsedUrl = new URL(trimmedLink);
    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      throw new Error('Informe um link válido para a evidência.');
    }
  } catch (error) {
    console.error(error);
    throw new Error('Informe um link válido para a evidência.');
  }

  const environmentRef = doc(firebaseFirestore, ENVIRONMENTS_COLLECTION, environmentId);
  const environmentSnapshot = await getDoc(environmentRef);
  const environment = environmentSnapshot.exists()
    ? normalizeEnvironment(
        environmentId,
        (environmentSnapshot.data() ?? {}) as Record<string, unknown>,
      )
    : null;

  await updateScenarioField(environmentId, scenarioId, { evidenciaArquivoUrl: trimmedLink });

  if (environment) {
    await logEnvironmentActivity(
      environment.storeId,
      environmentId,
      'attachment',
      `Evidência vinculada ao cenário ${scenarioId} - ${environment.identificador || environmentId}`,
    );
  }
  return trimmedLink;
};

export const observeEnvironmentBugs = (
  environmentId: string,
  callback: (bugs: EnvironmentBug[]) => void,
): (() => void) => {
  const bugsCollectionRef = getBugCollection(environmentId);
  return onSnapshot(bugsCollectionRef, (snapshot) => {
    const bugs = snapshot.docs
      .map((docSnapshot) =>
        normalizeBug(docSnapshot.id, (docSnapshot.data() ?? {}) as Record<string, unknown>),
      )
      .sort((first, second) => {
        const firstDate = first.createdAt ? new Date(first.createdAt).getTime() : 0;
        const secondDate = second.createdAt ? new Date(second.createdAt).getTime() : 0;
        return secondDate - firstDate;
      });

    callback(bugs);
  });
};

export const createEnvironmentBug = async (
  environmentId: string,
  payload: CreateEnvironmentBugInput,
): Promise<EnvironmentBug> => {
  const environmentRef = doc(firebaseFirestore, ENVIRONMENTS_COLLECTION, environmentId);
  const environmentSnapshot = await getDoc(environmentRef);
  const environment = environmentSnapshot.exists()
    ? normalizeEnvironment(
        environmentId,
        (environmentSnapshot.data() ?? {}) as Record<string, unknown>,
      )
    : null;

  const bugsCollectionRef = getBugCollection(environmentId);
  const docRef = await addDoc(bugsCollectionRef, {
    ...payload,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  const snapshot = await getDoc(docRef);
  const bug = normalizeBug(snapshot.id, (snapshot.data() ?? {}) as Record<string, unknown>);

  if (environment) {
    await logEnvironmentActivity(
      environment.storeId,
      environmentId,
      'create',
      `Bug criado: ${bug.title}`,
      'environment_bug',
    );
  }

  return bug;
};

export const updateEnvironmentBug = async (
  environmentId: string,
  bugId: string,
  payload: UpdateEnvironmentBugInput,
): Promise<void> => {
  const environmentRef = doc(firebaseFirestore, ENVIRONMENTS_COLLECTION, environmentId);
  const environmentSnapshot = await getDoc(environmentRef);
  const environment = environmentSnapshot.exists()
    ? normalizeEnvironment(
        environmentId,
        (environmentSnapshot.data() ?? {}) as Record<string, unknown>,
      )
    : null;

  const bugRef = doc(
    firebaseFirestore,
    ENVIRONMENTS_COLLECTION,
    environmentId,
    BUGS_SUBCOLLECTION,
    bugId,
  );
  await updateDoc(bugRef, {
    ...payload,
    updatedAt: serverTimestamp(),
  });

  if (environment) {
    await logEnvironmentActivity(
      environment.storeId,
      environmentId,
      'update',
      `Bug atualizado: ${payload.title ?? bugId}`,
      'environment_bug',
    );
  }
};

export const deleteEnvironmentBug = async (environmentId: string, bugId: string): Promise<void> => {
  const environmentRef = doc(firebaseFirestore, ENVIRONMENTS_COLLECTION, environmentId);
  const environmentSnapshot = await getDoc(environmentRef);
  const environment = environmentSnapshot.exists()
    ? normalizeEnvironment(
        environmentId,
        (environmentSnapshot.data() ?? {}) as Record<string, unknown>,
      )
    : null;

  const bugRef = doc(
    firebaseFirestore,
    ENVIRONMENTS_COLLECTION,
    environmentId,
    BUGS_SUBCOLLECTION,
    bugId,
  );
  await deleteDoc(bugRef);

  if (environment) {
    await logEnvironmentActivity(
      environment.storeId,
      environmentId,
      'delete',
      `Bug removido (${bugId})`,
      'environment_bug',
    );
  }
};

interface TransitionEnvironmentStatusParams {
  environment: Environment;
  targetStatus: EnvironmentStatus;
  currentUserId?: string | null;
}

export const transitionEnvironmentStatus = async ({
  environment,
  targetStatus,
  currentUserId,
}: TransitionEnvironmentStatusParams): Promise<void> => {
  if (!environment) {
    throw new EnvironmentStatusError('INVALID_ENVIRONMENT', 'Environment not found.');
  }

  if (environment.status === targetStatus) {
    return;
  }

  if (targetStatus === 'done') {
    const hasIncompleteScenario = Object.values(environment.scenarios ?? {}).some((scenario) => {
      const statuses = getScenarioPlatformStatuses(scenario);
      return isIncompleteStatus(statuses.mobile) || isIncompleteStatus(statuses.desktop);
    });

    if (hasIncompleteScenario) {
      throw new EnvironmentStatusError(
        'PENDING_SCENARIOS',
        'There are pending or in-progress scenarios that must be completed before finishing the environment.',
      );
    }
  }

  const nextTimeTracking = computeNextTimeTracking(environment.timeTracking, targetStatus);
  const payload: UpdateEnvironmentInput = {
    status: targetStatus,
    timeTracking: nextTimeTracking,
  };

  if (targetStatus === 'in_progress') {
    const scenariosEntries = Object.entries(environment.scenarios ?? {});

    if (scenariosEntries.length > 0) {
      const scenarios = scenariosEntries.reduce<Record<string, EnvironmentScenario>>(
        (acc, [scenarioId, scenario]) => {
          acc[scenarioId] = {
            ...scenario,
            status: 'em_andamento',
            statusMobile: 'em_andamento',
            statusDesktop: 'em_andamento',
          };
          return acc;
        },
        {},
      );

      payload.scenarios = scenarios;
    }
  }

  if (targetStatus === 'done') {
    const uniqueParticipants = Array.from(
      new Set([...(environment.participants ?? []), ...(environment.presentUsersIds ?? [])]),
    );
    payload.concludedBy = currentUserId ?? null;
    payload.participants = uniqueParticipants;
  }

  await updateEnvironment(environment.id, payload);

  await logEnvironmentActivity(
    environment.storeId,
    environment.id,
    'status_change',
    `Status do ambiente atualizado para ${targetStatus} (${environment.identificador || environment.id})`,
  );
};

const computeNextTimeTracking = (
  current: EnvironmentTimeTracking,
  targetStatus: EnvironmentStatus,
): EnvironmentTimeTracking => {
  const now = new Date().toISOString();

  if (targetStatus === 'backlog') {
    return { start: null, end: null, totalMs: 0 };
  }

  if (targetStatus === 'in_progress') {
    return { start: current.start ?? now, end: null, totalMs: current.totalMs };
  }

  if (targetStatus === 'done') {
    const startTimestamp = current.start ? new Date(current.start).getTime() : Date.now();
    const totalMs = current.totalMs + Math.max(0, Date.now() - startTimestamp);
    return { start: current.start ?? now, end: now, totalMs };
  }

  return current;
};

const isIncompleteStatus = (status: EnvironmentScenarioStatus): boolean =>
  !SCENARIO_COMPLETED_STATUSES.includes(status);

const getScenarioLabel = (environment: Environment, scenarioId: string | null) => {
  if (!scenarioId) {
    return 'Não vinculado';
  }

  return environment.scenarios?.[scenarioId]?.titulo ?? 'Cenário removido';
};

const normalizeParticipants = (
  environment: Environment,
  participantProfiles: UserSummary[] = [],
  t: (key: string, options?: Record<string, string>) => string,
) => {
  const uniqueIds = Array.from(new Set(environment.participants ?? []));
  const profileMap = new Map(participantProfiles.map((profile) => [profile.id, profile]));

  return uniqueIds.map((id) => {
    const profile = profileMap.get(id);
    const displayName =
      profile?.displayName?.trim() || profile?.email || t('dynamic.fallbackParticipant', { id });

    return {
      id,
      name: displayName,
      email: profile?.email ?? t('dynamic.noEmail'),
    };
  });
};

const buildTimeTrackingSummary = (environment: Environment) => {
  const isRunning = environment.status === 'in_progress';
  const totalMs = getElapsedMilliseconds(environment.timeTracking, isRunning, Date.now());

  return {
    start: formatDateTime(environment.timeTracking?.start ?? null),
    end: formatEndDateTime(environment.timeTracking ?? null, isRunning),
    total: formatDurationFromMs(totalMs),
  };
};

const translateScenarioStatus = (value: EnvironmentScenarioStatus, t: (key: string) => string) => {
  const key = `environmentEvidenceTable.status_${value}`;
  const translated = t(key);
  return translated === key ? value : translated;
};

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

const URL_PATTERN = /\b((https?:\/\/|www\.)[^\s]+|[a-z0-9.-]+\.[a-z]{2,}(?:\/[^\s]*)?)/gi;

const buildHref = (value: string) => (/^https?:\/\//i.test(value) ? value : `https://${value}`);

const linkifyHtml = (value: string) => {
  if (!value) {
    return '';
  }

  let result = '';
  let lastIndex = 0;
  const regex = new RegExp(URL_PATTERN);

  value.replace(regex, (match, _value, _protocol, offset: number) => {
    if (offset > lastIndex) {
      result += escapeHtml(value.slice(lastIndex, offset));
    }

    const href = buildHref(match);
    result += `<a href="${escapeHtml(href)}" target="_blank" rel="noreferrer noopener">${escapeHtml(match)}</a>`;
    lastIndex = offset + match.length;
    return match;
  });

  if (lastIndex < value.length) {
    result += escapeHtml(value.slice(lastIndex));
  }

  return result || escapeHtml(value);
};

const buildExternalLink = (value: string | null | undefined) => {
  const trimmed = value?.trim();
  if (!trimmed) {
    return null;
  }
  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }
  if (trimmed.includes('.')) {
    return `https://${trimmed}`;
  }
  return null;
};

const formatCriticalityLabel = (value: string, t: (key: string) => string) => {
  const normalized = normalizeCriticalityEnum(value);
  if (normalized === 'LOW') {
    return t('scenarioOptions.low');
  }
  if (normalized === 'MEDIUM') {
    return t('scenarioOptions.medium');
  }
  if (normalized === 'HIGH') {
    return t('scenarioOptions.high');
  }
  if (normalized === 'CRITICAL') {
    return t('scenarioOptions.critical');
  }
  return value?.trim() || t('storeSummary.emptyValue');
};

export const exportEnvironmentAsPDF = (
  environment: Environment,
  bugs: EnvironmentBug[] = [],
  participantProfiles: UserSummary[] = [],
): void => {
  if (typeof window === 'undefined') {
    return;
  }

  const t = i18n.t.bind(i18n);
  const normalizedParticipants = normalizeParticipants(environment, participantProfiles, t);
  const timeSummary = buildTimeTrackingSummary(environment);
  const scenarioCount = Object.values(environment.scenarios ?? {}).length * 2;
  const statusLabel = t(ENVIRONMENT_STATUS_LABEL[environment.status]);
  const testTypeLabel = translateEnvironmentOption(environment.tipoTeste, t);
  const momentLabel = translateEnvironmentOption(environment.momento, t);
  const exportTitle = t('environmentExport.title', { id: environment.identificador });
  const jiraTask = environment.jiraTask?.trim() || '';
  const jiraHref = buildExternalLink(jiraTask);
  const jiraValue = jiraHref
    ? `<a href="${escapeHtml(jiraHref)}" target="_blank" rel="noreferrer noopener">${escapeHtml(
        jiraTask,
      )}</a>`
    : escapeHtml(jiraTask || t('dynamic.identifierFallback'));
  const urlList =
    (environment.urls ?? []).length > 0
      ? `<ul>${(environment.urls ?? [])
          .map((url) => {
            const href = buildExternalLink(url);
            const label = escapeHtml(url);
            return href
              ? `<li><a href="${escapeHtml(
                  href,
                )}" target="_blank" rel="noreferrer noopener">${label}</a></li>`
              : `<li>${label}</li>`;
          })
          .join('')}</ul>`
      : `<p>${t('environmentExport.noUrls')}</p>`;
  const scenarioRows = Object.values(environment.scenarios ?? {})
    .map((scenario) => {
      const statuses = getScenarioPlatformStatuses(scenario);
      const statusMobile = translateScenarioStatus(statuses.mobile, t);
      const statusDesktop = translateScenarioStatus(statuses.desktop, t);
      const evidenceLabel = scenario.evidenciaArquivoUrl
        ? t('environmentEvidenceTable.evidencia_abrir')
        : t('environmentEvidenceTable.evidencia_sem');
      const criticalityLabel = formatCriticalityLabel(scenario.criticidade, t);
      const observation =
        scenario.observacao?.trim() || t('environmentEvidenceTable.observacao_none');
      return `
        <tr>
          <td>${linkifyHtml(scenario.titulo)}</td>
          <td>${linkifyHtml(scenario.categoria)}</td>
          <td>${escapeHtml(criticalityLabel)}</td>
          <td>${linkifyHtml(observation)}</td>
          <td>${escapeHtml(statusMobile)}</td>
          <td>${escapeHtml(statusDesktop)}</td>
          <td>${
            scenario.evidenciaArquivoUrl
              ? `<a href="${escapeHtml(
                  scenario.evidenciaArquivoUrl,
                )}" target="_blank" rel="noreferrer noopener">${escapeHtml(evidenceLabel)}</a>`
              : escapeHtml(evidenceLabel)
          }</td>
        </tr>
      `;
    })
    .join('');

  const participantRows =
    normalizedParticipants.length > 0
      ? normalizedParticipants
          .map(
            (participant) => `
        <tr>
          <td>${escapeHtml(participant.name)}</td>
          <td>${escapeHtml(participant.email)}</td>
        </tr>
      `,
          )
          .join('')
      : `
        <tr>
          <td colspan="2">${t('environmentExport.noParticipants')}</td>
        </tr>
      `;

  const bugRows =
    bugs.length > 0
      ? bugs
          .map(
            (bug) => `
        <tr>
          <td>${escapeHtml(bug.title)}</td>
          <td>${escapeHtml(t(BUG_STATUS_LABEL[bug.status]))}</td>
          <td>${escapeHtml(getScenarioLabel(environment, bug.scenarioId))}</td>
          <td>${linkifyHtml(bug.description ?? t('environmentExport.noDescription'))}</td>
        </tr>
      `,
          )
          .join('')
      : `
        <tr>
          <td colspan="4">${t('environmentExport.noBugs')}</td>
        </tr>
      `;

  const documentContent = `
    <html>
      <head>
        <title>${escapeHtml(exportTitle)}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 24px; }
          h1 { margin-bottom: 0; }
          h2 { margin-top: 24px; }
          .summary-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 12px; padding: 12px; background: #f5f7fb; border: 1px solid #e5e7eb; border-radius: 12px; }
          .summary-grid strong { display: block; margin-top: 4px; }
          table { width: 100%; border-collapse: collapse; margin-top: 16px; }
          th, td { border: 1px solid #d1d5db; padding: 8px; text-align: left; }
        </style>
      </head>
      <body>
        <h1>${escapeHtml(exportTitle)}</h1>
        <p>${escapeHtml(t('environmentExport.statusLabel'))}: ${escapeHtml(statusLabel)}</p>
        <p>${escapeHtml(t('environmentExport.typeLabel'))}: ${escapeHtml(
          environment.tipoAmbiente,
        )} · ${escapeHtml(testTypeLabel)}</p>
        ${
          environment.momento
            ? `<p>${escapeHtml(t('environmentExport.momentLabel'))}: ${escapeHtml(momentLabel)}</p>`
            : ''
        }
        ${
          environment.release
            ? `<p>${escapeHtml(t('environmentExport.releaseLabel'))}: ${escapeHtml(
                environment.release,
              )}</p>`
            : ''
        }
        <p>${t('environmentExport.jiraLabel')}: ${jiraValue}</p>
        <h2>${t('environmentExport.summaryTitle')}</h2>
        <div class="summary-grid">
          <div>
            <span>${t('environmentExport.startLabel')}</span>
            <strong>${escapeHtml(timeSummary.start)}</strong>
          </div>
          <div>
            <span>${t('environmentExport.endLabel')}</span>
            <strong>${escapeHtml(timeSummary.end)}</strong>
          </div>
          <div>
            <span>${t('environmentExport.totalLabel')}</span>
            <strong>${escapeHtml(timeSummary.total)}</strong>
          </div>
          <div>
            <span>${t('environmentExport.suiteLabel')}</span>
            <strong>${escapeHtml(environment.suiteName ?? t('dynamic.suiteNameFallback'))}</strong>
          </div>
          <div>
            <span>${t('environmentExport.totalScenariosLabel')}</span>
            <strong>${scenarioCount}</strong>
          </div>
          <div>
            <span>${t('environmentExport.bugsLabel')}</span>
            <strong>${bugs.length}</strong>
          </div>
          <div>
            <span>${t('environmentExport.participantsLabel')}</span>
            <strong>${normalizedParticipants.length}</strong>
          </div>
        </div>
        <h3>${t('environmentExport.monitoredUrlsTitle')}</h3>
        ${urlList}
        <h2>${t('environmentExport.participantsTitle')}</h2>
        <table class="participants-table">
          <thead>
            <tr>
              <th>${t('environmentExport.participantName')}</th>
              <th>${t('environmentExport.participantEmail')}</th>
            </tr>
          </thead>
          <tbody>${participantRows}</tbody>
        </table>
        <h2>${t('environmentExport.scenariosTitle')}</h2>
        <table>
          <thead>
            <tr>
              <th>${t('environmentEvidenceTable.table_titulo')}</th>
              <th>${t('environmentEvidenceTable.table_categoria')}</th>
              <th>${t('environmentEvidenceTable.table_criticidade')}</th>
              <th>${t('environmentEvidenceTable.table_observacao')}</th>
              <th>${t('environmentEvidenceTable.table_status_mobile')}</th>
              <th>${t('environmentEvidenceTable.table_status_desktop')}</th>
              <th>${t('environmentEvidenceTable.table_evidencia')}</th>
            </tr>
          </thead>
          <tbody>${scenarioRows}</tbody>
        </table>
        <h2>${t('environmentExport.bugsTitle')}</h2>
        <table>
          <thead>
            <tr>
              <th>${t('environmentExport.bugTitle')}</th>
              <th>${t('environmentExport.bugStatus')}</th>
              <th>${t('environmentExport.bugScenario')}</th>
              <th>${t('environmentExport.bugDescription')}</th>
            </tr>
          </thead>
          <tbody>${bugRows}</tbody>
        </table>
      </body>
    </html>
  `;

  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    throw new Error(t('environmentExport.printError'));
  }

  printWindow.document.write(documentContent);
  printWindow.document.close();
  printWindow.focus();
  printWindow.print();
};

export const copyEnvironmentAsMarkdown = async (
  environment: Environment,
  bugs: EnvironmentBug[] = [],
  participantProfiles: UserSummary[] = [],
): Promise<void> => {
  if (typeof navigator === 'undefined' && typeof document === 'undefined') {
    return;
  }

  const t = i18n.t.bind(i18n);
  const normalizedParticipants = normalizeParticipants(environment, participantProfiles, t);
  const timeSummary = buildTimeTrackingSummary(environment);
  const scenarioCount = Object.values(environment.scenarios ?? {}).length * 2;
  const statusLabel = t(ENVIRONMENT_STATUS_LABEL[environment.status]);
  const testTypeLabel = translateEnvironmentOption(environment.tipoTeste, t);
  const momentLabel = translateEnvironmentOption(environment.momento, t);
  const scenarioTableRows = Object.values(environment.scenarios ?? {})
    .map((scenario) => {
      const statuses = getScenarioPlatformStatuses(scenario);
      const statusMobile = translateScenarioStatus(statuses.mobile, t);
      const statusDesktop = translateScenarioStatus(statuses.desktop, t);
      const evidenceLabel = scenario.evidenciaArquivoUrl
        ? t('environmentEvidenceTable.evidencia_abrir')
        : t('environmentEvidenceTable.evidencia_sem');
      const evidenceLink = scenario.evidenciaArquivoUrl
        ? `[${evidenceLabel}](${scenario.evidenciaArquivoUrl})`
        : evidenceLabel;
      const observation =
        scenario.observacao?.trim() || t('environmentEvidenceTable.observacao_none');
      return `| ${scenario.titulo} | ${scenario.categoria} | ${scenario.criticidade} | ${observation} | ${statusMobile} | ${statusDesktop} | ${evidenceLink} |`;
    })
    .join('\n');
  const scenarioTable = scenarioTableRows
    ? `| ${t('environmentEvidenceTable.table_titulo')} | ${t('environmentEvidenceTable.table_categoria')} | ${t('environmentEvidenceTable.table_criticidade')} | ${t('environmentEvidenceTable.table_observacao')} | ${t('environmentEvidenceTable.table_status_mobile')} | ${t('environmentEvidenceTable.table_status_desktop')} | ${t('environmentEvidenceTable.table_evidencia')} |\n| --- | --- | --- | --- | --- | --- | --- |\n${scenarioTableRows}`
    : `- ${t('environmentExport.noScenarios')}`;

  const bugLines = bugs
    .map((bug) => {
      const scenarioLabel = getScenarioLabel(environment, bug.scenarioId);
      const description = bug.description ? ` — ${bug.description}` : '';
      return `- **${bug.title}** (${t(BUG_STATUS_LABEL[bug.status])}) · ${t('environmentExport.bugScenario')}: ${scenarioLabel}${description}`;
    })
    .join('\n');

  const urls = (environment.urls ?? []).map((url) => `  - ${url}`).join('\n');
  const participants = normalizedParticipants
    .map((participant) => {
      const email = participant.email !== t('dynamic.noEmail') ? ` (${participant.email})` : '';
      return `- **${participant.name}**${email}`;
    })
    .join('\n');

  const markdown = `# ${t('environmentExport.title', { id: environment.identificador })}

- ${t('environmentExport.statusLabel')}: ${statusLabel}
- ${t('environmentExport.typeLabel')}: ${environment.tipoAmbiente} · ${testTypeLabel}
${environment.momento ? `- ${t('environmentExport.momentLabel')}: ${momentLabel}\n` : ''}${
    environment.release ? `- ${t('environmentExport.releaseLabel')}: ${environment.release}\n` : ''
  }- ${t('environmentExport.jiraLabel')}: ${environment.jiraTask || t('dynamic.identifierFallback')}
- ${t('environmentExport.startLabel')}: ${timeSummary.start}
- ${t('environmentExport.endLabel')}: ${timeSummary.end}
- ${t('environmentExport.totalLabel')}: ${timeSummary.total}
- ${t('environmentExport.suiteLabel')}: ${environment.suiteName ?? t('dynamic.suiteNameFallback')}
- ${t('environmentExport.totalScenariosLabel')}: ${scenarioCount}
- ${t('environmentExport.bugsLabel')}: ${bugs.length}
- ${t('environmentExport.participantsLabel')}: ${normalizedParticipants.length}
- ${t('environmentExport.urlsLabel')}:\n${urls || `  - ${t('environmentExport.noUrls')}`}

## ${t('environmentExport.scenariosTitle')}
${scenarioTable}

## ${t('environmentExport.bugsTitle')}
${bugLines || `- ${t('environmentExport.noBugs')}`}

## ${t('environmentExport.participantsTitle')}
${participants || `- ${t('environmentExport.noParticipants')}`}
`;

  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(markdown);
    return;
  }

  if (typeof document !== 'undefined') {
    const textarea = document.createElement('textarea');
    textarea.value = markdown;
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
  }
};
