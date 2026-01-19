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
  ScenarioAverageEntry,
  ScenarioAverageMap,
  ScenarioExecution,
} from '../../domain/entities/scenarioExecution';
import { firebaseFirestore } from '../database/firebase';

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

const parseExecutionDuration = (value: unknown): number => {
  if (typeof value === 'number') {
    return value;
  }

  if (typeof value === 'string' && value.trim()) {
    return Number(value);
  }

  return Number.NaN;
};

const isValidDuration = (value: number): boolean => Number.isFinite(value) && value > 0;

const calculateMedian = (values: number[]): number => {
  if (values.length === 0) {
    return Number.NaN;
  }

  const sorted = values.slice().sort((first, second) => first - second);
  const mid = Math.floor(sorted.length / 2);

  if (sorted.length % 2 === 0) {
    return (sorted[mid - 1] + sorted[mid]) / 2;
  }

  return sorted[mid];
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
      totalMs: parseExecutionDuration(data.totalMs),
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
  const map = new Map<string, { entry: ScenarioAverageEntry; durations: number[] }>();

  executions.forEach((execution) => {
    if (!isValidDuration(execution.totalMs)) {
      return;
    }

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
        durations: [execution.totalMs],
      });
      return;
    }

    existing.entry.executions += 1;
    existing.entry.bestMs = Math.min(existing.entry.bestMs, execution.totalMs);
    existing.durations.push(execution.totalMs);
  });

  return Array.from(map.entries()).reduce<ScenarioAverageMap>((accumulator, [key, value]) => {
    const median = calculateMedian(value.durations);
    if (Number.isFinite(median)) {
      value.entry.averageMs = median;
    }
    accumulator[key] = value.entry;
    return accumulator;
  }, {});
};
