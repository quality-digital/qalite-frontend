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

import type {
  CreateEnvironmentInput,
  Environment,
  EnvironmentScenario,
  EnvironmentScenarioStatus,
  EnvironmentStatus,
  UpdateEnvironmentInput,
} from '../../domain/entities/Environment';
import type {
  EnvironmentRealtimeFilters,
  IEnvironmentRepository,
} from '../../domain/repositories/EnvironmentRepository';
import { firebaseFirestore, firebaseStorage } from '../firebase/firebaseConfig';

const ENVIRONMENTS_COLLECTION = 'environments';
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
        status: 'pendente',
        evidenciaArquivoUrl: null,
      };
      return acc;
    }

    const entry = value as Record<string, unknown>;
    acc[id] = {
      titulo: getString(entry.titulo),
      categoria: getString(entry.categoria),
      criticidade: getString(entry.criticidade),
      status: (entry.status ?? 'pendente') as EnvironmentScenarioStatus,
      evidenciaArquivoUrl: getStringOrNull(entry.evidenciaArquivoUrl),
    };
    return acc;
  }, {});
};

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

export class FirebaseEnvironmentRepository implements IEnvironmentRepository {
  create = async (payload: CreateEnvironmentInput): Promise<Environment> => {
    const docRef = await addDoc(environmentsCollection, {
      ...payload,
      loja: payload.storeId,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    const snapshot = await getDoc(docRef);
    return normalizeEnvironment(snapshot.id, (snapshot.data() ?? {}) as Record<string, unknown>);
  };

  update = async (environmentId: string, payload: UpdateEnvironmentInput): Promise<void> => {
    const environmentRef = doc(firebaseFirestore, ENVIRONMENTS_COLLECTION, environmentId);
    const data: Record<string, unknown> = {
      ...payload,
      updatedAt: serverTimestamp(),
    };

    if (payload.storeId) {
      data.loja = payload.storeId;
    }

    await updateDoc(environmentRef, data);
  };

  delete = async (environmentId: string): Promise<void> => {
    const environmentRef = doc(firebaseFirestore, ENVIRONMENTS_COLLECTION, environmentId);
    await deleteDoc(environmentRef);
  };

  observeById = (
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

  observeAll = (
    filters: EnvironmentRealtimeFilters,
    callback: (environments: Environment[]) => void,
  ): (() => void) => {
    const constraints: QueryConstraint[] = [];

    if (filters.storeId) {
      constraints.push(where('loja', '==', filters.storeId));
    }

    const environmentsQuery =
      constraints.length > 0
        ? query(environmentsCollection, ...constraints)
        : environmentsCollection;

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

  addUser = async (environmentId: string, userId: string): Promise<void> => {
    const environmentRef = doc(firebaseFirestore, ENVIRONMENTS_COLLECTION, environmentId);
    await runTransaction(firebaseFirestore, async (transaction) => {
      const snapshot = await transaction.get(environmentRef);
      if (!snapshot.exists()) {
        throw new Error('Ambiente não encontrado.');
      }

      const data = snapshot.data();
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
  };

  removeUser = async (environmentId: string, userId: string): Promise<void> => {
    const environmentRef = doc(firebaseFirestore, ENVIRONMENTS_COLLECTION, environmentId);
    await runTransaction(firebaseFirestore, async (transaction) => {
      const snapshot = await transaction.get(environmentRef);
      if (!snapshot.exists()) {
        return;
      }

      const presentUsers: string[] = snapshot.data()?.presentUsersIds ?? [];
      transaction.update(environmentRef, {
        presentUsersIds: presentUsers.filter((id) => id !== userId),
        updatedAt: serverTimestamp(),
      });
    });
  };

  updateScenarioStatus = async (
    environmentId: string,
    scenarioId: string,
    status: EnvironmentScenarioStatus,
  ): Promise<void> => {
    await updateScenarioField(environmentId, scenarioId, { status });
  };

  uploadScenarioEvidence = async (
    environmentId: string,
    scenarioId: string,
    file: File,
  ): Promise<string> => {
    if (!ACCEPTED_EVIDENCE_TYPES.includes(file.type)) {
      throw new Error('Formato de arquivo não suportado.');
    }

    const path = `environments/${environmentId}/scenarios/${scenarioId}/${Date.now()}-${file.name}`;
    const storageRef = ref(firebaseStorage, path);
    await uploadBytes(storageRef, file);
    const url = await getDownloadURL(storageRef);
    await updateScenarioField(environmentId, scenarioId, { evidenciaArquivoUrl: url });
    return url;
  };
}
