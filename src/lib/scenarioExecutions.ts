import {
  Timestamp,
  addDoc,
  collection,
  getDocs,
  query,
  serverTimestamp,
  where,
} from 'firebase/firestore';

import type { CreateScenarioExecutionInput, ScenarioExecution } from './types';
import { firebaseFirestore } from './firebase';

const SCENARIO_EXECUTIONS_COLLECTION = 'scenarioExecutions';
const scenarioExecutionsCollection = collection(firebaseFirestore, SCENARIO_EXECUTIONS_COLLECTION);

export interface ScenarioAverageEntry {
  scenarioId: string | null;
  scenarioTitle: string;
  executions: number;
  averageMs: number;
  bestMs: number;
}

export type ScenarioAverageMap = Record<string, ScenarioAverageEntry>;

const parseTimestamp = (value: Timestamp | string | null | undefined): string | null => {
  if (!value) {
    return null;
  }

  if (value instanceof Timestamp) {
    return value.toDate().toISOString();
  }

  return typeof value === 'string' ? value : null;
};

export const createScenarioExecution = async (
  payload: CreateScenarioExecutionInput,
): Promise<void> => {
  await addDoc(scenarioExecutionsCollection, {
    ...payload,
    qaId: payload.qaId ?? null,
    qaName: payload.qaName ?? null,
    createdAt: serverTimestamp(),
  });
};

export const listScenarioExecutionsByStore = async (
  storeId: string,
): Promise<ScenarioExecution[]> => {
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
};

export const logScenarioExecution = async (
  payload: CreateScenarioExecutionInput,
): Promise<void> => {
  if (!payload.organizationId) {
    throw new Error('Organização inválida para registrar o tempo do cenário.');
  }

  await createScenarioExecution(payload);
};

export const getStoreScenarioAverages = async (storeId: string): Promise<ScenarioAverageMap> => {
  if (!storeId) {
    throw new Error('Loja inválida para consultar métricas.');
  }

  const executions = await listScenarioExecutionsByStore(storeId);
  return buildScenarioAverageMap(executions);
};

const buildScenarioAverageMap = (executions: ScenarioExecution[]): ScenarioAverageMap => {
  const map = new Map<string, { entry: ScenarioAverageEntry; totalMs: number }>();

  executions.forEach((execution) => {
    const key = execution.scenarioId || `${execution.scenarioTitle}-${execution.environmentId}`;
    const title = execution.scenarioTitle?.trim() || 'Cenário';
    const existing = key ? map.get(key) : undefined;

    if (!existing) {
      map.set(key, {
        entry: {
          scenarioId: execution.scenarioId || null,
          scenarioTitle: title,
          executions: 1,
          averageMs: execution.totalMs,
          bestMs: execution.totalMs,
        },
        totalMs: execution.totalMs,
      });
      return;
    }

    existing.entry.executions += 1;
    existing.totalMs += execution.totalMs;
    existing.entry.bestMs = Math.min(existing.entry.bestMs, execution.totalMs);
    existing.entry.averageMs = existing.totalMs / existing.entry.executions;
  });

  return Array.from(map.entries()).reduce<ScenarioAverageMap>((accumulator, [key, value]) => {
    accumulator[key] = value.entry;
    return accumulator;
  }, {});
};
