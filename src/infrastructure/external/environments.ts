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
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';

import {
  type ActivityLog,
  type CreateEnvironmentBugInput,
  type CreateEnvironmentInput,
  type Environment,
  type EnvironmentBug,
  type EnvironmentBugStatus,
  type EnvironmentScenario,
  type EnvironmentScenarioPlatform,
  type EnvironmentScenarioStatus,
  type EnvironmentStatus,
  type EnvironmentTimeTracking,
  type UpdateEnvironmentBugInput,
  type UpdateEnvironmentInput,
  type UserSummary,
} from '../../domain/entities/types';
import { firebaseFirestore, firebaseStorage } from '../database/firebase';
import { EnvironmentStatusError } from '../../shared/errors/firebaseErrors';
import { BUG_STATUS_LABEL } from '../../shared/config/environmentLabels';
import { logActivity } from './logs';

export interface EnvironmentRealtimeFilters {
  storeId?: string;
}

const ENVIRONMENTS_COLLECTION = 'environments';
const BUGS_SUBCOLLECTION = 'bugs';
const STORES_COLLECTION = 'stores';
const ACCEPTED_EVIDENCE_TYPES = [
  'image/png',
  'image/jpeg',
  'image/gif',
  'image/webp',
  'application/pdf',
  'video/mp4',
  'video/quicktime',
  'application/zip',
  'application/x-zip-compressed',
];
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
  file: File,
): Promise<string> => {
  if (!ACCEPTED_EVIDENCE_TYPES.includes(file.type)) {
    throw new Error('Formato de arquivo não suportado.');
  }

  const environmentRef = doc(firebaseFirestore, ENVIRONMENTS_COLLECTION, environmentId);
  const environmentSnapshot = await getDoc(environmentRef);
  const environment = environmentSnapshot.exists()
    ? normalizeEnvironment(
        environmentId,
        (environmentSnapshot.data() ?? {}) as Record<string, unknown>,
      )
    : null;

  const path = `environments/${environmentId}/scenarios/${scenarioId}/${Date.now()}-${file.name}`;
  const storageRef = ref(firebaseStorage, path);
  await uploadBytes(storageRef, file);
  const url = await getDownloadURL(storageRef);
  await updateScenarioField(environmentId, scenarioId, { evidenciaArquivoUrl: url });

  if (environment) {
    await logEnvironmentActivity(
      environment.storeId,
      environmentId,
      'attachment',
      `Evidência adicionada ao cenário ${scenarioId} - ${environment.identificador || environmentId}`,
    );
  }
  return url;
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
) => {
  const uniqueIds = Array.from(new Set(environment.participants ?? []));
  const profileMap = new Map(participantProfiles.map((profile) => [profile.id, profile]));

  return uniqueIds.map((id) => {
    const profile = profileMap.get(id);
    const displayName = profile?.displayName?.trim() || profile?.email || `Participante ${id}`;

    return {
      id,
      name: displayName,
      email: profile?.email ?? 'Não informado',
    };
  });
};

export const exportEnvironmentAsPDF = (
  environment: Environment,
  bugs: EnvironmentBug[] = [],
  participantProfiles: UserSummary[] = [],
): void => {
  if (typeof window === 'undefined') {
    return;
  }

  const normalizedParticipants = normalizeParticipants(environment, participantProfiles);
  const scenarioRows = Object.values(environment.scenarios ?? {})
    .map((scenario) => {
      const statuses = getScenarioPlatformStatuses(scenario);
      return `
        <tr>
          <td>${scenario.titulo}</td>
          <td>${scenario.categoria}</td>
          <td>${scenario.criticidade}</td>
          <td>${scenario.observacao || ''}</td>
          <td>${statuses.mobile}</td>
          <td>${statuses.desktop}</td>
          <td>${
            scenario.evidenciaArquivoUrl
              ? `<a href="${scenario.evidenciaArquivoUrl}">Arquivo</a>`
              : 'Sem evidência'
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
          <td>${participant.name}</td>
          <td>${participant.email}</td>
        </tr>
      `,
          )
          .join('')
      : `
        <tr>
          <td colspan="2">Nenhum participante registrado.</td>
        </tr>
      `;

  const bugRows =
    bugs.length > 0
      ? bugs
          .map(
            (bug) => `
        <tr>
          <td>${bug.title}</td>
          <td>${BUG_STATUS_LABEL[bug.status]}</td>
          <td>${getScenarioLabel(environment, bug.scenarioId)}</td>
          <td>${bug.description ?? 'Sem descrição'}</td>
        </tr>
      `,
          )
          .join('')
      : `
        <tr>
          <td colspan="4">Nenhum bug registrado.</td>
        </tr>
      `;

  const documentContent = `
    <html>
      <head>
        <title>Ambiente ${environment.identificador}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 24px; }
          h1 { margin-bottom: 0; }
          table { width: 100%; border-collapse: collapse; margin-top: 16px; }
          th, td { border: 1px solid #d1d5db; padding: 8px; text-align: left; }
        </style>
      </head>
      <body>
        <h1>Ambiente ${environment.identificador}</h1>
        <p>Status: ${environment.status}</p>
        <p>Tipo: ${environment.tipoAmbiente} · ${environment.tipoTeste}</p>
        ${environment.momento ? `<p>Momento: ${environment.momento}</p>` : ''}
        ${environment.release ? `<p>Release: ${environment.release}</p>` : ''}
        <p>Jira: ${environment.jiraTask || 'Não informado'}</p>
        <h2>Participantes</h2>
        <table class="participants-table">
          <thead>
            <tr>
              <th>Nome</th>
              <th>Email</th>
            </tr>
          </thead>
          <tbody>${participantRows}</tbody>
        </table>
        <h2>Cenários</h2>
        <table>
          <thead>
            <tr>
              <th>Título</th>
              <th>Categoria</th>
              <th>Criticidade</th>
              <th>Observação</th>
              <th>Status Mobile</th>
              <th>Status Desktop</th>
              <th>Evidência</th>
            </tr>
          </thead>
          <tbody>${scenarioRows}</tbody>
        </table>
        <h2>Bugs registrados</h2>
        <table>
          <thead>
            <tr>
              <th>Título</th>
              <th>Status</th>
              <th>Cenário</th>
              <th>Descrição</th>
            </tr>
          </thead>
          <tbody>${bugRows}</tbody>
        </table>
      </body>
    </html>
  `;

  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    throw new Error('Não foi possível abrir a janela para impressão.');
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

  const normalizedParticipants = normalizeParticipants(environment, participantProfiles);
  const scenarioTableRows = Object.values(environment.scenarios ?? {})
    .map((scenario) => {
      const statuses = getScenarioPlatformStatuses(scenario);
      const evidenceLink = scenario.evidenciaArquivoUrl
        ? `[evidência](${scenario.evidenciaArquivoUrl})`
        : 'Sem evidência';
      const observation = scenario.observacao?.trim() || '—';
      return `| ${scenario.titulo} | ${scenario.categoria} | ${scenario.criticidade} | ${observation} | ${statuses.mobile} | ${statuses.desktop} | ${evidenceLink} |`;
    })
    .join('\n');
  const scenarioTable = scenarioTableRows
    ? `| Título | Categoria | Criticidade | Observação | Status Mobile | Status Desktop | Evidência |\n| --- | --- | --- | --- | --- | --- | --- |\n${scenarioTableRows}`
    : '- Nenhum cenário cadastrado';

  const bugLines = bugs
    .map((bug) => {
      const scenarioLabel = getScenarioLabel(environment, bug.scenarioId);
      const description = bug.description ? ` — ${bug.description}` : '';
      return `- **${bug.title}** (${BUG_STATUS_LABEL[bug.status]}) · Cenário: ${scenarioLabel}${description}`;
    })
    .join('\n');

  const urls = (environment.urls ?? []).map((url) => `  - ${url}`).join('\n');
  const participants = normalizedParticipants
    .map((participant) => {
      const email = participant.email !== 'Não informado' ? ` (${participant.email})` : '';
      return `- **${participant.name}**${email}`;
    })
    .join('\n');

  const markdown = `# Ambiente ${environment.identificador}

- Status: ${environment.status}
- Tipo: ${environment.tipoAmbiente} · ${environment.tipoTeste}
${environment.momento ? `- Momento: ${environment.momento}\n` : ''}${
    environment.release ? `- Release: ${environment.release}\n` : ''
  }- Jira: ${environment.jiraTask || 'Não informado'}
- URLs:\n${urls || '  - Nenhuma URL cadastrada'}

## Cenários
${scenarioTable}

## Bugs
${bugLines || '- Nenhum bug registrado'}

## Participantes
${participants || '- Nenhum participante registrado'}
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
