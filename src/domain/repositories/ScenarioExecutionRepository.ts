import type { CreateScenarioExecutionInput, ScenarioAverageMap, ScenarioExecution } from '../entities/types';

export interface ScenarioExecutionRepository {
  logExecution: (input: CreateScenarioExecutionInput) => Promise<void>;
  getStoreScenarioAverages: (storeId: string) => Promise<ScenarioAverageMap>;
  listByStore: (storeId: string) => Promise<ScenarioExecution[]>;
  create: (input: CreateScenarioExecutionInput) => Promise<void>;
}
