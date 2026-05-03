import {
  Timestamp,
  addDoc,
  collection,
  deleteDoc,
  doc,
  increment,
  onSnapshot,
  query,
  runTransaction,
  serverTimestamp,
  updateDoc,
  where,
  orderBy,
  limit,
  startAfter,
  type Query,
  type QueryDocumentSnapshot,
  type QueryConstraint,
  type QuerySnapshot,
  type DocumentData,
} from 'firebase/firestore';

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
import i18n from '../../lib/i18n';
import { getDocsCacheThenServer } from './firestoreCache';
import { CacheStore } from '../cache/CacheStore';
import { fetchWithCache } from '../cache/cacheFetch';
import { buildStorageFileName, uploadFileAndGetUrl } from './storage';

const ENVIRONMENTS_COLLECTION = 'environments';
const BUGS_SUBCOLLECTION = 'bugs';
const environmentsCollection = collection(firebaseFirestore, ENVIRONMENTS_COLLECTION);
const ENVIRONMENT_CACHE = new CacheStore({
  namespace: 'environments',
  version: 'v1',
  ttlMs: 1000 * 60 * 5,
});
const ENVIRONMENT_LIST_CACHE_PREFIX = 'listSummary:';
const ENVIRONMENT_DETAIL_CACHE_PREFIX = 'detail:';
const ENVIRONMENT_PAGE_SIZE = 50;
const invalidateEnvironmentLists = () => {
  ENVIRONMENT_CACHE.invalidatePrefix(ENVIRONMENT_LIST_CACHE_PREFIX);
};
const buildEnvironmentDetailKey = (environmentId: string) =>
  `${ENVIRONMENT_DETAIL_CACHE_PREFIX}${environmentId}`;

export const SCENARIO_COMPLETED_STATUSES: EnvironmentScenarioStatus[] = [
  'concluido',
  'concluido_automatizado',
  'nao_se_aplica',
];

export const DEFAULT_ENVIRONMENT_COLUMNS = ['Desktop', 'Mobile'];

export const getEnvironmentColumns = (
  environment: Pick<Environment, 'environmentColumns'> | null | undefined,
): string[] => {
  const normalized = (environment?.environmentColumns ?? [])
    .map((column) => column.trim())
    .filter((column, index, array) => column.length > 0 && array.indexOf(column) === index);

  return normalized.length > 0 ? normalized : DEFAULT_ENVIRONMENT_COLUMNS;
};

export const getScenarioPlatformStatuses = (
  scenario: EnvironmentScenario,
  columns: string[] = DEFAULT_ENVIRONMENT_COLUMNS,
): Record<EnvironmentScenarioPlatform, EnvironmentScenarioStatus> => {
  const explicitStatuses = scenario.statusByEnvironment ?? {};

  return columns.reduce<Record<EnvironmentScenarioPlatform, EnvironmentScenarioStatus>>(
    (acc, column, index) => {
      const legacyStatus =
        index === 0
          ? (scenario.statusMobile ?? scenario.status)
          : index === 1
            ? (scenario.statusDesktop ?? scenario.status)
            : scenario.status;

      acc[column] = explicitStatuses[column] ?? legacyStatus;
      return acc;
    },
    {},
  );
};

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
      statusByEnvironment:
        typeof entry.statusByEnvironment === 'object' && entry.statusByEnvironment !== null
          ? Object.entries(entry.statusByEnvironment as Record<string, unknown>).reduce<
              Record<string, EnvironmentScenarioStatus>
            >((statusAcc, [key, statusValue]) => {
              if (typeof key === 'string' && typeof statusValue === 'string' && key.trim()) {
                statusAcc[key.trim()] = statusValue as EnvironmentScenarioStatus;
              }
              return statusAcc;
            }, {})
          : undefined,
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
  severity: getStringOrNull(data.severity ?? data.severidade) as EnvironmentBug['severity'],
  priority: getStringOrNull(data.priority ?? data.prioridade) as EnvironmentBug['priority'],
  reportedBy: getStringOrNull(data.reportedBy ?? data.reportadoPor),
  stepsToReproduce: getStringOrNull(data.stepsToReproduce ?? data.passosParaReproduzir),
  expectedResult: getStringOrNull(data.expectedResult ?? data.resultadoEsperado),
  actualResult: getStringOrNull(data.actualResult ?? data.resultadoAtual),
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
  executionDate: getStringOrNull(data.executionDate),
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
  environmentColumns: getStringArray(data.environmentColumns),
});

export const createEnvironment = async (payload: CreateEnvironmentInput): Promise<Environment> => {
  const now = new Date().toISOString();
  const docRef = await addDoc(environmentsCollection, {
    ...payload,
    loja: payload.storeId,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  invalidateEnvironmentLists();

  const environment: Environment = {
    id: docRef.id,
    identificador: payload.identificador,
    storeId: payload.storeId,
    suiteId: payload.suiteId,
    suiteName: payload.suiteName,
    urls: payload.urls,
    jiraTask: payload.jiraTask,
    tipoAmbiente: payload.tipoAmbiente,
    tipoTeste: payload.tipoTeste,
    momento: payload.momento,
    release: payload.release,
    executionDate: payload.executionDate,
    status: payload.status,
    createdAt: now,
    updatedAt: now,
    timeTracking: payload.timeTracking,
    presentUsersIds: payload.presentUsersIds,
    concludedBy: payload.concludedBy,
    scenarios: payload.scenarios,
    bugs: payload.bugs,
    totalCenarios: payload.totalCenarios,
    participants: payload.participants,
    publicShareLanguage: payload.publicShareLanguage,
  };

  ENVIRONMENT_CACHE.set(buildEnvironmentDetailKey(environment.id), environment);

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
  invalidateEnvironmentLists();
  ENVIRONMENT_CACHE.remove(buildEnvironmentDetailKey(environmentId));
};

export const deleteEnvironment = async (environmentId: string): Promise<void> => {
  const environmentRef = doc(firebaseFirestore, ENVIRONMENTS_COLLECTION, environmentId);
  await deleteDoc(environmentRef);
  invalidateEnvironmentLists();
  ENVIRONMENT_CACHE.remove(buildEnvironmentDetailKey(environmentId));
};

export const observeEnvironment = (
  environmentId: string,
  callback: (environment: Environment | null) => void,
  onError?: (error: Error) => void,
): (() => void) => {
  const environmentRef = doc(firebaseFirestore, ENVIRONMENTS_COLLECTION, environmentId);
  return onSnapshot(
    environmentRef,
    (snapshot) => {
      if (!snapshot.exists()) {
        callback(null);
        return;
      }

      const environment = normalizeEnvironment(
        snapshot.id,
        snapshot.data({ serverTimestamps: 'estimate' }) ?? {},
      );
      ENVIRONMENT_CACHE.set(buildEnvironmentDetailKey(snapshot.id), environment);
      callback(environment);
    },
    (error) => {
      console.error(error);
      onError?.(error as Error);
      callback(null);
    },
  );
};

export const observeEnvironments = (
  filters: EnvironmentRealtimeFilters,
  callback: (environments: Environment[]) => void,
  onError?: (error: Error) => void,
): (() => void) => {
  const constraints: QueryConstraint[] = [];

  if (filters.storeId) {
    constraints.push(where('loja', '==', filters.storeId));
  }

  const environmentsQuery =
    constraints.length > 0 ? query(environmentsCollection, ...constraints) : environmentsCollection;

  return onSnapshot(
    environmentsQuery,
    (snapshot) => {
      const list = snapshot.docs
        .map((docSnapshot) =>
          normalizeEnvironment(
            docSnapshot.id,
            docSnapshot.data({ serverTimestamps: 'estimate' }) ?? {},
          ),
        )
        .sort((a, b) => {
          const aDate = a.createdAt ? new Date(a.createdAt).getTime() : 0;
          const bDate = b.createdAt ? new Date(b.createdAt).getTime() : 0;
          return bDate - aDate;
        });

      callback(list);
    },
    (error) => {
      console.error(error);
      onError?.(error as Error);
      callback([]);
    },
  );
};

const buildEnvironmentQuery = (filters: EnvironmentRealtimeFilters) => {
  const constraints: QueryConstraint[] = [];

  if (filters.storeId) {
    constraints.push(where('loja', '==', filters.storeId));
  }

  return constraints.length > 0
    ? query(environmentsCollection, ...constraints, orderBy('createdAt', 'desc'))
    : query(environmentsCollection, orderBy('createdAt', 'desc'));
};

const buildEnvironmentListKey = (filters: EnvironmentRealtimeFilters) =>
  `${ENVIRONMENT_LIST_CACHE_PREFIX}${filters.storeId ?? 'all'}`;

const listEnvironmentsFromServer = async (
  filters: EnvironmentRealtimeFilters,
): Promise<Environment[]> => {
  try {
    const environmentsQuery = buildEnvironmentQuery(filters);
    const environments: Environment[] = [];
    let lastDoc: QueryDocumentSnapshot | null = null;
    let hasMore = true;

    while (hasMore) {
      const pageQuery: Query<DocumentData> = lastDoc
        ? query(environmentsQuery, startAfter(lastDoc), limit(ENVIRONMENT_PAGE_SIZE))
        : query(environmentsQuery, limit(ENVIRONMENT_PAGE_SIZE));
      const snapshot: QuerySnapshot<DocumentData> = await getDocsCacheThenServer(pageQuery);

      snapshot.docs.forEach((docSnapshot: QueryDocumentSnapshot<DocumentData>) => {
        environments.push(
          normalizeEnvironment(
            docSnapshot.id,
            docSnapshot.data({ serverTimestamps: 'estimate' }) ?? {},
          ),
        );
      });

      lastDoc = snapshot.docs[snapshot.docs.length - 1] ?? null;
      hasMore = Boolean(lastDoc && snapshot.size === ENVIRONMENT_PAGE_SIZE);
    }

    return environments;
  } catch (error) {
    console.error(error);
    const fallbackQuery = filters.storeId
      ? query(environmentsCollection, where('loja', '==', filters.storeId))
      : environmentsCollection;
    const snapshot = await getDocsCacheThenServer(fallbackQuery);
    return snapshot.docs
      .map((docSnapshot) =>
        normalizeEnvironment(
          docSnapshot.id,
          docSnapshot.data({ serverTimestamps: 'estimate' }) ?? {},
        ),
      )
      .sort((a, b) => {
        const aDate = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const bDate = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return bDate - aDate;
      });
  }
};

export const listEnvironmentsSummary = async (
  filters: EnvironmentRealtimeFilters,
): Promise<Environment[]> => {
  const cacheKey = buildEnvironmentListKey(filters);
  return fetchWithCache({
    cache: ENVIRONMENT_CACHE,
    key: cacheKey,
    fetcher: () => listEnvironmentsFromServer(filters),
    fallback: [],
  });
};

export const getEnvironmentCached = (environmentId: string): Environment | null => {
  if (!environmentId) {
    return null;
  }

  return ENVIRONMENT_CACHE.get(buildEnvironmentDetailKey(environmentId));
};

export const addEnvironmentUser = async (environmentId: string, userId: string): Promise<void> => {
  const environmentRef = doc(firebaseFirestore, ENVIRONMENTS_COLLECTION, environmentId);
  await runTransaction(firebaseFirestore, async (transaction) => {
    const snapshot = await transaction.get(environmentRef);
    if (!snapshot.exists()) {
      throw new Error('Ambiente não encontrado.');
    }

    const data = snapshot.data({ serverTimestamps: 'estimate' }) ?? {};
    if (data.status === 'done') {
      throw new Error('Ambiente já concluído.');
    }

    const presentUsers: string[] = (data.presentUsersIds as string[] | undefined) ?? [];
    const participants: string[] = (data.participants as string[] | undefined) ?? [];

    if (presentUsers.includes(userId)) {
      return;
    }

    transaction.update(environmentRef, {
      presentUsersIds: [...presentUsers, userId],
      participants: participants.includes(userId) ? participants : [...participants, userId],
      updatedAt: serverTimestamp(),
    });
  });
};

export const removeEnvironmentUser = async (
  environmentId: string,
  userId: string,
): Promise<void> => {
  const environmentRef = doc(firebaseFirestore, ENVIRONMENTS_COLLECTION, environmentId);
  await runTransaction(firebaseFirestore, async (transaction) => {
    const snapshot = await transaction.get(environmentRef);
    if (!snapshot.exists()) {
      return;
    }

    const data = snapshot.data({ serverTimestamps: 'estimate' }) ?? {};
    const presentUsers: string[] = (data?.presentUsersIds as string[] | undefined) ?? [];
    const participants: string[] = (data?.participants as string[] | undefined) ?? [];
    const isPresent = presentUsers.includes(userId);
    const isParticipant = participants.includes(userId);
    if (!isPresent && !isParticipant) {
      return;
    }

    transaction.update(environmentRef, {
      presentUsersIds: isPresent ? presentUsers.filter((id) => id !== userId) : presentUsers,
      participants: isParticipant ? participants.filter((id) => id !== userId) : participants,
      updatedAt: serverTimestamp(),
    });
  });
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
  if (platform && platform !== 'mobile' && platform !== 'desktop') {
    await updateScenarioField(environmentId, scenarioId, {
      [`statusByEnvironment.${platform}`]: status,
    });
    return;
  }

  if (platform === 'mobile') {
    await updateScenarioField(environmentId, scenarioId, {
      statusMobile: status,
      'statusByEnvironment.Mobile': status,
    });
    return;
  }

  if (platform === 'desktop') {
    await updateScenarioField(environmentId, scenarioId, {
      statusDesktop: status,
      'statusByEnvironment.Desktop': status,
    });
    return;
  }

  await updateScenarioField(environmentId, scenarioId, { status });
};

export const uploadScenarioEvidence = async (
  environmentId: string,
  scenarioId: string,
  evidenceLink: string | File,
): Promise<string> => {
  let resolvedLink = '';

  if (typeof evidenceLink === 'string') {
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

    resolvedLink = trimmedLink;
  } else {
    const fileName = buildStorageFileName(evidenceLink);
    resolvedLink = await uploadFileAndGetUrl(
      `environments/${environmentId}/scenarios/${scenarioId}/${fileName}`,
      evidenceLink,
    );
  }

  await updateScenarioField(environmentId, scenarioId, { evidenciaArquivoUrl: resolvedLink });

  return resolvedLink;
};

export const listEnvironmentBugs = async (environmentId: string): Promise<EnvironmentBug[]> => {
  const bugsCollectionRef = getBugCollection(environmentId);
  try {
    const snapshot = await getDocsCacheThenServer(bugsCollectionRef);
    return snapshot.docs
      .map((docSnapshot) =>
        normalizeBug(
          docSnapshot.id,
          (docSnapshot.data({ serverTimestamps: 'estimate' }) ?? {}) as Record<string, unknown>,
        ),
      )
      .sort((first, second) => {
        const firstDate = first.createdAt ? new Date(first.createdAt).getTime() : 0;
        const secondDate = second.createdAt ? new Date(second.createdAt).getTime() : 0;
        return secondDate - firstDate;
      });
  } catch (error) {
    console.error(error);
    return [];
  }
};

export const createEnvironmentBug = async (
  environmentId: string,
  payload: CreateEnvironmentBugInput,
): Promise<EnvironmentBug> => {
  const bugsCollectionRef = getBugCollection(environmentId);
  const now = new Date().toISOString();
  const docRef = await addDoc(bugsCollectionRef, {
    ...payload,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  const environmentRef = doc(firebaseFirestore, ENVIRONMENTS_COLLECTION, environmentId);
  await updateDoc(environmentRef, {
    bugs: increment(1),
    updatedAt: serverTimestamp(),
  });

  return {
    id: docRef.id,
    scenarioId: payload.scenarioId,
    title: payload.title,
    description: payload.description ?? null,
    status: payload.status,
    severity: payload.severity ?? null,
    priority: payload.priority ?? null,
    reportedBy: payload.reportedBy ?? null,
    stepsToReproduce: payload.stepsToReproduce ?? null,
    expectedResult: payload.expectedResult ?? null,
    actualResult: payload.actualResult ?? null,
    createdAt: now,
    updatedAt: now,
  };
};

export const updateEnvironmentBug = async (
  environmentId: string,
  bugId: string,
  payload: UpdateEnvironmentBugInput,
): Promise<void> => {
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
};

export const deleteEnvironmentBug = async (environmentId: string, bugId: string): Promise<void> => {
  const bugRef = doc(
    firebaseFirestore,
    ENVIRONMENTS_COLLECTION,
    environmentId,
    BUGS_SUBCOLLECTION,
    bugId,
  );
  await deleteDoc(bugRef);

  const environmentRef = doc(firebaseFirestore, ENVIRONMENTS_COLLECTION, environmentId);
  await runTransaction(firebaseFirestore, async (transaction) => {
    const snapshot = await transaction.get(environmentRef);
    if (!snapshot.exists()) {
      return;
    }
    const data = snapshot.data({ serverTimestamps: 'estimate' }) ?? {};
    const currentBugs = Number(data?.bugs ?? 0);
    transaction.update(environmentRef, {
      bugs: Math.max(0, currentBugs - 1),
      updatedAt: serverTimestamp(),
    });
  });
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
      const statuses = Object.values(
        getScenarioPlatformStatuses(scenario, getEnvironmentColumns(environment)),
      );
      return statuses.some((status) => isIncompleteStatus(status));
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
    const environmentColumns = getEnvironmentColumns(environment);

    if (scenariosEntries.length > 0) {
      const scenarios = scenariosEntries.reduce<Record<string, EnvironmentScenario>>(
        (acc, [scenarioId, scenario]) => {
          acc[scenarioId] = {
            ...scenario,
            status: 'em_andamento',
            statusMobile: 'em_andamento',
            statusDesktop: 'em_andamento',
            statusByEnvironment: environmentColumns.reduce<
              Record<string, EnvironmentScenarioStatus>
            >((statusesAcc, column) => {
              statusesAcc[column] = 'em_andamento';
              return statusesAcc;
            }, {}),
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
      photoURL: profile?.photoURL ?? null,
    };
  });
};

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

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

export const exportEnvironmentAsPDF = (
  environment: Environment,
  bugs: EnvironmentBug[] = [],
  participantProfiles: UserSummary[] = [],
  store?: { name?: string | null; logoUrl?: string | null } | null,
  organization?: { name?: string | null; logoUrl?: string | null } | null,
): void => {
  if (typeof window === 'undefined') {
    return;
  }

  const t = i18n.t.bind(i18n);
  void bugs;
  const normalizedParticipants = normalizeParticipants(environment, participantProfiles, t);
  const exportTitle = t('environmentExport.title', { id: environment.identificador });
  const storeLabel = store?.name?.trim();
  const exportTitleWithStore = storeLabel ? `${exportTitle} · ${storeLabel}` : exportTitle;
  const organizationName = organization?.name?.trim() || '';
  const organizationLogo = organization?.logoUrl?.trim() || '';
  const storeLogo = store?.logoUrl?.trim() || '';
  const organizationHeader =
    organizationName || organizationLogo || storeLogo
      ? `<div class="org-header">
          ${organizationLogo ? `<img src="${escapeHtml(organizationLogo)}" alt="${escapeHtml(organizationName || 'Organization logo')}" class="org-logo" />` : ''}
          ${organizationName ? `<span class="org-name">${escapeHtml(organizationName)}</span>` : ''}
          ${storeLogo ? `<img src="${escapeHtml(storeLogo)}" alt="${escapeHtml(storeLabel || 'Store logo')}" class="org-logo" />` : ''}
        </div>`
      : '';
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
  const documentContent = `
    <html>
      <head>
        <title>${escapeHtml(exportTitleWithStore)}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 24px; }
          h1 { margin-bottom: 8px; }
          .meta { margin: 12px 0; }
          .participant-photo { width: 48px; height: 48px; border-radius: 50%; object-fit: cover; margin-right: 8px; }
        </style>
      </head>
      <body>
        ${organizationHeader}
        <h1>${escapeHtml(exportTitleWithStore)}</h1>
        <div class="meta">
          <strong>${t('editEnvironmentModal.identifier')}:</strong> ${escapeHtml(environment.identificador)}
        </div>
        <div class="meta">
          <strong>${t('environmentExport.jiraLabel')}:</strong> ${jiraValue}
        </div>
        <div class="meta">
          <strong>${t('environmentSummary.urls')}:</strong>
          ${urlList}
        </div>
        <div class="meta">
          <strong>${t('environmentSummary.whoIsParticipating')}:</strong>
          <div>
            ${normalizedParticipants
              .map((p) =>
                p.photoUrl
                  ? `<img src="${escapeHtml(p.photoUrl)}" class="participant-photo" alt="${escapeHtml(p.name)}" />${escapeHtml(p.name)}`
                  : `<span class="participant-photo">${escapeHtml(p.initials || p.name?.charAt(0) || '')}</span>${escapeHtml(p.name)}`,
              )
              .join('<br/>')}
          </div>
        </div>
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
  storeName?: string,
): Promise<void> => {
  if (typeof navigator === 'undefined' && typeof document === 'undefined') {
    return;
  }

  const t = i18n.t.bind(i18n);
  void bugs;
  const normalizedParticipants = normalizeParticipants(environment, participantProfiles, t);

  const urls = (environment.urls ?? []).map((url) => `  - ${url}`).join('\n');
  const participants = normalizedParticipants
    .map((p) => p.name)
    .filter(Boolean)
    .join(', ');

  const exportTitle = t('environmentExport.title', { id: environment.identificador });
  const storeLabel = storeName?.trim();
  const markdownTitle = storeLabel ? `${exportTitle} · ${storeLabel}` : exportTitle;

  const markdown = `# ${markdownTitle}

- ${t('editEnvironmentModal.identifier')}: ${environment.identificador}
- ${t('environmentExport.jiraLabel')}: ${environment.jiraTask || t('environmentSummary.notInformed')}
- ${t('environmentSummary.urls')}:\n${urls || `  - ${t('environmentExport.noUrls')}`}
- ${t('environmentSummary.whoIsParticipating')}: ${participants || t('environmentSummary.noParticipants')}
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
