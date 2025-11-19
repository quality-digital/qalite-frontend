import type {
  CreateScenarioExecutionInput,
  ScenarioExecution,
} from '../entities/ScenarioExecution';

export interface IScenarioExecutionRepository {
  create(payload: CreateScenarioExecutionInput): Promise<void>;
  listByStore(storeId: string): Promise<ScenarioExecution[]>;
}
