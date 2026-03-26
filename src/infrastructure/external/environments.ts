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
import {
  BUG_PRIORITY_LABEL,
  BUG_SEVERITY_LABEL,
  ENVIRONMENT_STATUS_LABEL,
} from '../../shared/config/environmentLabels';
import {
  formatDateTime,
  formatDurationFromMs,
  formatEndDateTime,
  getElapsedMilliseconds,
} from '../../shared/utils/time';
import { translateEnvironmentOption } from '../../shared/utils/environmentOptions';
import i18n from '../../lib/i18n';
import { normalizeCriticalityEnum } from '../../shared/utils/scenarioEnums';
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
    if (data?.status === 'done') {
      throw new Error('Não é possível sair de um ambiente concluído.');
    }

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
      photoURL: profile?.photoURL ?? null,
    };
  });
};

const buildTimeTrackingSummary = (environment: Environment) => {
  const isRunning = environment.status === 'in_progress';
  const totalMs = getElapsedMilliseconds(environment.timeTracking, isRunning, Date.now());
  const t = i18n.t.bind(i18n);
  const locale = i18n.language;
  const emptyLabel = t('environmentSummary.notRecorded');

  return {
    start: formatDateTime(environment.timeTracking?.start ?? null, {
      locale,
      emptyLabel,
    }),
    end: formatEndDateTime(environment.timeTracking ?? null, isRunning, {
      locale,
      emptyLabel,
      inProgressLabel: t('environmentSummary.inProgress'),
      notEndedLabel: t('environmentSummary.notEnded'),
    }),
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

const normalizeLabel = (value: string) =>
  (value ?? '')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .trim()
    .toLowerCase();

const getCriticalityClassName = (value: string) => {
  const normalized = normalizeCriticalityEnum(value);
  if (normalized === 'LOW') {
    return 'criticality-pill criticality-pill--low';
  }
  if (normalized === 'MEDIUM') {
    return 'criticality-pill criticality-pill--medium';
  }
  if (normalized === 'HIGH') {
    return 'criticality-pill criticality-pill--high';
  }
  if (normalized === 'CRITICAL') {
    return 'criticality-pill criticality-pill--critical';
  }
  return 'criticality-pill criticality-pill--unknown';
};

const getStatusClassName = (status: string) => {
  const normalized = normalizeLabel(status);
  if (normalized.includes('nao') && normalized.includes('aplica')) {
    return 'status-pill status-pill--na';
  }
  if (
    normalized.includes('conclu') ||
    normalized.includes('complete') ||
    normalized.includes('resolvid')
  ) {
    return 'status-pill status-pill--done';
  }
  if (normalized.includes('andamento') || normalized.includes('progress')) {
    return 'status-pill status-pill--in-progress';
  }
  if (normalized.includes('pend') || normalized.includes('abert')) {
    return 'status-pill status-pill--pending';
  }
  if (
    normalized.includes('bloq') ||
    normalized.includes('erro') ||
    normalized.includes('block') ||
    normalized.includes('fail')
  ) {
    return 'status-pill status-pill--blocked';
  }
  return 'status-pill status-pill--neutral';
};

const getSeverityClassName = (severity: string) => {
  const normalized = normalizeLabel(severity);
  if (normalized.includes('crit') || normalized.includes('critical')) {
    return 'severity-pill severity-pill--critical';
  }
  if (normalized.includes('alta') || normalized.includes('high')) {
    return 'severity-pill severity-pill--high';
  }
  if (normalized.includes('media') || normalized.includes('medium')) {
    return 'severity-pill severity-pill--medium';
  }
  if (normalized.includes('baixa') || normalized.includes('low')) {
    return 'severity-pill severity-pill--low';
  }
  return 'severity-pill severity-pill--unknown';
};

const getPriorityClassName = (priority: string) => {
  const normalized = normalizeLabel(priority);
  if (
    normalized.includes('urgente') ||
    normalized.includes('crit') ||
    normalized.includes('critical')
  ) {
    return 'priority-pill priority-pill--critical';
  }
  if (normalized.includes('alta') || normalized.includes('high')) {
    return 'priority-pill priority-pill--high';
  }
  if (normalized.includes('media') || normalized.includes('medium')) {
    return 'priority-pill priority-pill--medium';
  }
  if (normalized.includes('baixa') || normalized.includes('low')) {
    return 'priority-pill priority-pill--low';
  }
  return 'priority-pill priority-pill--unknown';
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
  const normalizedParticipants = normalizeParticipants(environment, participantProfiles, t);
  const timeSummary = buildTimeTrackingSummary(environment);
  const environmentColumns = getEnvironmentColumns(environment);
  const scenarioCount = Object.values(environment.scenarios ?? {}).length;
  const statusLabel = t(ENVIRONMENT_STATUS_LABEL[environment.status]);
  const testTypeLabel = translateEnvironmentOption(environment.tipoTeste, t);
  const momentLabel = translateEnvironmentOption(environment.momento, t);
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
  const scenarioRows = Object.values(environment.scenarios ?? {})
    .map((scenario) => {
      const statuses = getScenarioPlatformStatuses(scenario, environmentColumns);
      const criticalityLabel = formatCriticalityLabel(scenario.criticidade, t);
      const criticalityClass = getCriticalityClassName(scenario.criticidade);
      const observation =
        scenario.observacao?.trim() || t('environmentEvidenceTable.observacao_none');
      return `
        <tr>
          <td>${linkifyHtml(scenario.titulo)}</td>
          <td>${linkifyHtml(scenario.categoria)}</td>
          <td><span class="${criticalityClass}">${escapeHtml(criticalityLabel)}</span></td>
          <td>${linkifyHtml(observation)}</td>
          ${environmentColumns
            .map((column) => {
              const statusLabel = translateScenarioStatus(statuses[column], t);
              return `<td><span class="${getStatusClassName(statusLabel)}">${escapeHtml(statusLabel)}</span></td>`;
            })
            .join('')}
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
          <td>
            ${
              participant.photoURL
                ? `<img src="${escapeHtml(participant.photoURL)}" alt="${escapeHtml(
                    participant.name,
                  )}" class="participant-photo" />`
                : `<span class="participant-photo participant-photo--empty">-</span>`
            }
          </td>
          <td>${escapeHtml(participant.name)}</td>
          <td>${escapeHtml(participant.email)}</td>
        </tr>
      `,
          )
          .join('')
      : `
        <tr>
          <td colspan="3">${t('environmentExport.noParticipants')}</td>
        </tr>
      `;

  const bugRows =
    bugs.length > 0
      ? bugs
          .map((bug) => {
            const severityLabel = bug.severity
              ? t(BUG_SEVERITY_LABEL[bug.severity])
              : t('environmentExport.noSeverity');
            const priorityLabel = bug.priority
              ? t(BUG_PRIORITY_LABEL[bug.priority])
              : t('environmentExport.noPriority');
            const actualResult = bug.actualResult?.trim() || t('environmentExport.noActualResult');
            const severityClass = getSeverityClassName(severityLabel);
            const priorityClass = getPriorityClassName(priorityLabel);
            return `
        <tr>
          <td>${escapeHtml(getScenarioLabel(environment, bug.scenarioId))}</td>
          <td><span class="${severityClass}">${escapeHtml(severityLabel)}</span></td>
          <td><span class="${priorityClass}">${escapeHtml(priorityLabel)}</span></td>
          <td>${linkifyHtml(actualResult)}</td>
        </tr>
      `;
          })
          .join('')
      : `
        <tr>
          <td colspan="4">${t('environmentExport.noBugs')}</td>
        </tr>
      `;

  const documentContent = `
    <html>
      <head>
        <title>${escapeHtml(exportTitleWithStore)}</title>
        <style>
          :root {
            --color-surface-muted: #f5f7fb;
            --color-border: #e5e7eb;
            --table-border: #d1d5db;
            --criticality-low-bg: #22c55e;
            --criticality-low-text: #ffffff;
            --criticality-medium-bg: #f59e0b;
            --criticality-medium-text: #ffffff;
            --criticality-high-bg: #f97316;
            --criticality-high-text: #ffffff;
            --criticality-critical-bg: #8b5cf6;
            --criticality-critical-text: #ffffff;
            --criticality-unknown-bg: #bdc3c7;
            --criticality-unknown-text: #2c3e50;
            --status-pending-bg: #f59e0b;
            --status-pending-text: #ffffff;
            --status-in-progress-bg: #3b82f6;
            --status-in-progress-text: #ffffff;
            --status-done-bg: #22c55e;
            --status-done-text: #ffffff;
            --status-blocked-bg: #ef4444;
            --status-blocked-text: #ffffff;
            --status-na-bg: #94a3b8;
            --status-na-text: #ffffff;
            --status-neutral-bg: #bdc3c7;
            --status-neutral-text: #2c3e50;
            --severity-low-bg: #22c55e;
            --severity-low-text: #ffffff;
            --severity-medium-bg: #f59e0b;
            --severity-medium-text: #ffffff;
            --severity-high-bg: #f97316;
            --severity-high-text: #ffffff;
            --severity-critical-bg: #8b5cf6;
            --severity-critical-text: #ffffff;
            --severity-unknown-bg: #bdc3c7;
            --severity-unknown-text: #2c3e50;
          }
          body { font-family: Arial, sans-serif; padding: 24px; }
          h1 { margin-bottom: 0; }
          h2 { margin-top: 24px; }
          .org-header { display: flex; align-items: center; gap: 12px; margin-bottom: 12px; }
          .org-logo { width: 48px; height: 48px; border-radius: 10px; object-fit: contain; border: 1px solid var(--color-border); background: #fff; }
          .org-name { font-size: 16px; font-weight: 600; color: #111827; }
          .summary-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 12px; padding: 12px; background: var(--color-surface-muted); border: 1px solid var(--color-border); border-radius: 12px; }
          .summary-grid strong { display: block; margin-top: 4px; }
          table { width: 100%; border-collapse: collapse; margin-top: 16px; }
          th, td { border: 1px solid var(--table-border); padding: 8px; text-align: left; }
          .participant-photo { width: 32px; height: 32px; border-radius: 50%; object-fit: cover; }
          .participant-photo--empty { width: 32px; height: 32px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; background: #e5e7eb; color: #6b7280; font-size: 0.75rem; }
          .criticality-pill,
          .status-pill,
          .severity-pill,
          .priority-pill { display: inline-flex; align-items: center; justify-content: center; padding: 2px 10px; border-radius: 999px; font-weight: 700; font-size: 12px; text-transform: uppercase; letter-spacing: 0.04em; border: 1px solid var(--table-border); }
          .criticality-pill--low { background: var(--criticality-low-bg); color: var(--criticality-low-text); }
          .criticality-pill--medium { background: var(--criticality-medium-bg); color: var(--criticality-medium-text); }
          .criticality-pill--high { background: var(--criticality-high-bg); color: var(--criticality-high-text); }
          .criticality-pill--critical { background: var(--criticality-critical-bg); color: var(--criticality-critical-text); }
          .criticality-pill--unknown { background: var(--criticality-unknown-bg); color: var(--criticality-unknown-text); }
          .status-pill--pending { background: var(--status-pending-bg); color: var(--status-pending-text); }
          .status-pill--in-progress { background: var(--status-in-progress-bg); color: var(--status-in-progress-text); }
          .status-pill--done { background: var(--status-done-bg); color: var(--status-done-text); }
          .status-pill--blocked { background: var(--status-blocked-bg); color: var(--status-blocked-text); }
          .status-pill--na { background: var(--status-na-bg); color: var(--status-na-text); }
          .status-pill--neutral { background: var(--status-neutral-bg); color: var(--status-neutral-text); }
          .severity-pill--low, .priority-pill--low { background: var(--severity-low-bg); color: var(--severity-low-text); }
          .severity-pill--medium, .priority-pill--medium { background: var(--severity-medium-bg); color: var(--severity-medium-text); }
          .severity-pill--high, .priority-pill--high { background: var(--severity-high-bg); color: var(--severity-high-text); }
          .severity-pill--critical, .priority-pill--critical { background: var(--severity-critical-bg); color: var(--severity-critical-text); }
          .severity-pill--unknown, .priority-pill--unknown { background: var(--severity-unknown-bg); color: var(--severity-unknown-text); }
        </style>
      </head>
      <body>
        ${organizationHeader}
        <h1>${escapeHtml(exportTitleWithStore)}</h1>
        <p>${escapeHtml(t('environmentExport.statusLabel'))}: ${escapeHtml(statusLabel)}</p>
        <p>${escapeHtml(t('environmentExport.typeLabel'))}: ${escapeHtml(
          translateEnvironmentOption(environment.tipoAmbiente, t),
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
              <th>${t('environmentExport.participantPhoto')}</th>
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
              ${environmentColumns.map((column) => `<th>${escapeHtml(column)}</th>`).join('')}
            </tr>
          </thead>
          <tbody>${scenarioRows}</tbody>
        </table>
        <h2>${t('environmentExport.bugsTitle')}</h2>
        <table>
          <thead>
            <tr>
              <th>${t('environmentExport.bugScenario')}</th>
              <th>${t('environmentExport.bugSeverity')}</th>
              <th>${t('environmentExport.bugPriority')}</th>
              <th>${t('environmentExport.bugActualResult')}</th>
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
  storeName?: string,
): Promise<void> => {
  if (typeof navigator === 'undefined' && typeof document === 'undefined') {
    return;
  }

  const t = i18n.t.bind(i18n);
  const normalizedParticipants = normalizeParticipants(environment, participantProfiles, t);
  const timeSummary = buildTimeTrackingSummary(environment);
  const environmentColumns = getEnvironmentColumns(environment);
  const scenarioCount =
    Object.values(environment.scenarios ?? {}).length * environmentColumns.length;
  const statusLabel = t(ENVIRONMENT_STATUS_LABEL[environment.status]);
  const testTypeLabel = translateEnvironmentOption(environment.tipoTeste, t);
  const momentLabel = translateEnvironmentOption(environment.momento, t);
  const normalizeMarkdownCell = (value: string) =>
    value.replace(/\|/g, '\\|').replace(/\r?\n/g, '<br>');
  const scenarioTableRows = Object.values(environment.scenarios ?? {})
    .map((scenario) => {
      const statuses = getScenarioPlatformStatuses(scenario, environmentColumns);
      const observation =
        scenario.observacao?.trim() || t('environmentEvidenceTable.observacao_none');
      return `| ${normalizeMarkdownCell(scenario.titulo)} | ${normalizeMarkdownCell(
        scenario.categoria,
      )} | ${normalizeMarkdownCell(scenario.criticidade)} | ${normalizeMarkdownCell(
        observation,
      )} | ${environmentColumns
        .map((column) => normalizeMarkdownCell(translateScenarioStatus(statuses[column], t)))
        .join(' | ')} |`;
    })
    .join('\n');
  const scenarioTable = scenarioTableRows
    ? `| ${t('environmentEvidenceTable.table_titulo')} | ${t('environmentEvidenceTable.table_categoria')} | ${t('environmentEvidenceTable.table_criticidade')} | ${t('environmentEvidenceTable.table_observacao')} | ${environmentColumns.join(
        ' | ',
      )} |\n| --- | --- | --- | --- | ${environmentColumns
        .map(() => '---')
        .join(' | ')} |\n${scenarioTableRows}`
    : `- ${t('environmentExport.noScenarios')}`;

  const bugTableRows = bugs
    .map((bug) => {
      const scenarioLabel = getScenarioLabel(environment, bug.scenarioId);
      const severityLabel = bug.severity
        ? t(BUG_SEVERITY_LABEL[bug.severity])
        : t('environmentExport.noSeverity');
      const priorityLabel = bug.priority
        ? t(BUG_PRIORITY_LABEL[bug.priority])
        : t('environmentExport.noPriority');
      const actualResult = bug.actualResult?.trim() || t('environmentExport.noActualResult');
      return `| ${normalizeMarkdownCell(scenarioLabel)} | ${normalizeMarkdownCell(
        severityLabel,
      )} | ${normalizeMarkdownCell(priorityLabel)} | ${normalizeMarkdownCell(actualResult)} |`;
    })
    .join('\n');
  const bugTable = bugTableRows
    ? `| ${t('environmentExport.bugScenario')} | ${t('environmentExport.bugSeverity')} | ${t('environmentExport.bugPriority')} | ${t('environmentExport.bugActualResult')} |\n| --- | --- | --- | --- |\n${bugTableRows}`
    : `- ${t('environmentExport.noBugs')}`;

  const urls = (environment.urls ?? []).map((url) => `  - ${url}`).join('\n');
  const participants = normalizedParticipants
    .map((participant) => {
      const email = participant.email !== t('dynamic.noEmail') ? ` (${participant.email})` : '';
      return `- **${participant.name}**${email}`;
    })
    .join('\n');

  const exportTitle = t('environmentExport.title', { id: environment.identificador });
  const storeLabel = storeName?.trim();
  const markdownTitle = storeLabel ? `${exportTitle} · ${storeLabel}` : exportTitle;

  const markdown = `# ${markdownTitle}

- ${t('environmentExport.statusLabel')}: ${statusLabel}
- ${t('environmentExport.typeLabel')}: ${translateEnvironmentOption(
    environment.tipoAmbiente,
    t,
  )} · ${testTypeLabel}
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
${bugTable}

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
