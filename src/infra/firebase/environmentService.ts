import {
  Timestamp,
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  updateDoc,
  where,
} from 'firebase/firestore';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';

import type {
  CreateEnvironmentInput,
  Environment,
  EnvironmentScenarioUpdate,
  EnvironmentStatus,
  UpdateEnvironmentInput,
} from '../../domain/entities/Environment';
import { firebaseFirestore, firebaseStorage } from './firebaseConfig';

const ENVIRONMENTS_COLLECTION = 'environments';

const environmentsCollection = collection(firebaseFirestore, ENVIRONMENTS_COLLECTION);

const parseTimestamp = (value: Timestamp | string | null | undefined): string | null => {
  if (!value) {
    return null;
  }

  if (value instanceof Timestamp) {
    return value.toDate().toISOString();
  }

  return typeof value === 'string' ? value : null;
};

const normalizeEnvironment = (id: string, data: Record<string, unknown>): Environment => ({
  id,
  identificador: data.identificador ?? '',
  loja: data.loja ?? '',
  urls: Array.isArray(data.urls) ? data.urls : [],
  jiraTask: data.jiraTask ?? '',
  tipoAmbiente: data.tipoAmbiente ?? '',
  tipoTeste: data.tipoTeste ?? '',
  status: (data.status ?? 'backlog') as EnvironmentStatus,
  createdAt: parseTimestamp(data.createdAt) ?? null,
  updatedAt: parseTimestamp(data.updatedAt) ?? null,
  timeTracking: {
    start: parseTimestamp(data.timeTracking?.start),
    end: parseTimestamp(data.timeTracking?.end),
    totalMs: Number(data.timeTracking?.totalMs ?? 0),
  },
  presentUsersIds: Array.isArray(data.presentUsersIds) ? data.presentUsersIds : [],
  scenarios: typeof data.scenarios === 'object' && data.scenarios !== null ? data.scenarios : {},
  bugs: Number(data.bugs ?? 0),
  totalCenarios: Number(data.totalCenarios ?? 0),
});

export const createEnvironment = async (payload: CreateEnvironmentInput): Promise<Environment> => {
  const docRef = await addDoc(environmentsCollection, {
    ...payload,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  const snapshot = await getDoc(docRef);
  return normalizeEnvironment(snapshot.id, snapshot.data() ?? payload);
};

export const updateEnvironment = async (
  environmentId: string,
  payload: UpdateEnvironmentInput,
): Promise<void> => {
  const environmentRef = doc(firebaseFirestore, ENVIRONMENTS_COLLECTION, environmentId);
  await updateDoc(environmentRef, {
    ...payload,
    updatedAt: serverTimestamp(),
  });
};

export const deleteEnvironment = async (environmentId: string): Promise<void> => {
  const environmentRef = doc(firebaseFirestore, ENVIRONMENTS_COLLECTION, environmentId);
  await deleteDoc(environmentRef);
};

export const getEnvironmentByIdRealtime = (
  environmentId: string,
  callback: (environment: Environment | null) => void,
) => {
  const environmentRef = doc(firebaseFirestore, ENVIRONMENTS_COLLECTION, environmentId);
  return onSnapshot(environmentRef, (snapshot) => {
    if (!snapshot.exists()) {
      callback(null);
      return;
    }

    callback(normalizeEnvironment(snapshot.id, snapshot.data() ?? {}));
  });
};

interface EnvironmentRealtimeFilters {
  storeId?: string;
}

export const getAllEnvironmentsRealtime = (
  filters: EnvironmentRealtimeFilters,
  callback: (environments: Environment[]) => void,
) => {
  const constraints = [orderBy('createdAt', 'desc')];

  if (filters.storeId) {
    constraints.push(where('loja', '==', filters.storeId));
  }

  const environmentsQuery = query(environmentsCollection, ...constraints);
  return onSnapshot(environmentsQuery, (snapshot) => {
    const list = snapshot.docs.map((docSnapshot) =>
      normalizeEnvironment(docSnapshot.id, docSnapshot.data() ?? {}),
    );
    callback(list);
  });
};

export const updatePresentUsers = async (
  environmentId: string,
  userId: string,
  action: 'enter' | 'leave',
): Promise<void> => {
  const environmentRef = doc(firebaseFirestore, ENVIRONMENTS_COLLECTION, environmentId);

  await runTransaction(firebaseFirestore, async (transaction) => {
    const snapshot = await transaction.get(environmentRef);

    if (!snapshot.exists()) {
      throw new Error('Ambiente não encontrado.');
    }

    const currentUsers: string[] = snapshot.data()?.presentUsersIds ?? [];
    let updatedUsers = currentUsers;

    if (action === 'enter' && !currentUsers.includes(userId)) {
      updatedUsers = [...currentUsers, userId];
    }

    if (action === 'leave') {
      updatedUsers = currentUsers.filter((id) => id !== userId);
    }

    transaction.update(environmentRef, {
      presentUsersIds: updatedUsers,
      updatedAt: serverTimestamp(),
    });
  });
};

export const updateScenarioEvidence = async (
  environmentId: string,
  scenarioId: string,
  updates: EnvironmentScenarioUpdate,
): Promise<void> => {
  const environmentRef = doc(firebaseFirestore, ENVIRONMENTS_COLLECTION, environmentId);
  const payload: Record<string, unknown> = {};

  Object.entries(updates).forEach(([key, value]) => {
    payload[`scenarios.${scenarioId}.${key}`] = value;
  });

  payload.updatedAt = serverTimestamp();

  await updateDoc(environmentRef, payload);
};

export const uploadEvidence = async (
  environmentId: string,
  scenarioId: string,
  file: File,
): Promise<string> => {
  const path = `environments/${environmentId}/scenarios/${scenarioId}/${Date.now()}-${file.name}`;
  const storageRef = ref(firebaseStorage, path);
  await uploadBytes(storageRef, file);
  return getDownloadURL(storageRef);
};
