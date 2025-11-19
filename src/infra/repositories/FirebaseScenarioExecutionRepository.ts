import {
  Timestamp,
  addDoc,
  collection,
  getDocs,
  query,
  serverTimestamp,
  where,
} from 'firebase/firestore';

import type {
  CreateScenarioExecutionInput,
  ScenarioExecution,
} from '../../domain/entities/ScenarioExecution';
import type { IScenarioExecutionRepository } from '../../domain/repositories/ScenarioExecutionRepository';
import { firebaseFirestore } from '../firebase/firebaseConfig';

const SCENARIO_EXECUTIONS_COLLECTION = 'scenarioExecutions';
const scenarioExecutionsCollection = collection(firebaseFirestore, SCENARIO_EXECUTIONS_COLLECTION);

const parseTimestamp = (value: Timestamp | string | null | undefined): string | null => {
  if (!value) {
    return null;
  }

  if (value instanceof Timestamp) {
    return value.toDate().toISOString();
  }

  return typeof value === 'string' ? value : null;
};

export class FirebaseScenarioExecutionRepository implements IScenarioExecutionRepository {
  async create(payload: CreateScenarioExecutionInput): Promise<void> {
    await addDoc(scenarioExecutionsCollection, {
      ...payload,
      qaId: payload.qaId ?? null,
      qaName: payload.qaName ?? null,
      createdAt: serverTimestamp(),
    });
  }

  async listByStore(storeId: string): Promise<ScenarioExecution[]> {
    const executionQuery = query(scenarioExecutionsCollection, where('storeId', '==', storeId));
    const snapshot = await getDocs(executionQuery);

    return snapshot.docs.map((docSnapshot) => {
      const data = docSnapshot.data();
      return {
        id: docSnapshot.id,
        organizationId: String(data.organizationId ?? ''),
        storeId: String(data.storeId ?? ''),
        environmentId: String(data.environmentId ?? ''),
        scenarioId: String(data.scenarioId ?? ''),
        scenarioTitle: String(data.scenarioTitle ?? ''),
        qaId: data.qaId ? String(data.qaId) : null,
        qaName: data.qaName ? String(data.qaName) : null,
        totalMs: Number(data.totalMs ?? 0),
        executedAt: String(data.executedAt ?? ''),
        createdAt: parseTimestamp(data.createdAt as Timestamp | string | null | undefined),
      } satisfies ScenarioExecution;
    });
  }
}
