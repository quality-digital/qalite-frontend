import type { ScenarioExecutionRepository } from '../../domain/repositories/ScenarioExecutionRepository';
import type {
  CreateScenarioExecutionInput,
  ScenarioAverageMap,
  ScenarioExecution,
} from '../../domain/entities/types';

export class ScenarioExecutionUseCases {
  constructor(private readonly scenarioExecutionRepository: ScenarioExecutionRepository) {}

  logExecution(input: CreateScenarioExecutionInput): Promise<void> {
    return this.scenarioExecutionRepository.logExecution(input);
  }

  getStoreScenarioAverages(storeId: string): Promise<ScenarioAverageMap> {
    return this.scenarioExecutionRepository.getStoreScenarioAverages(storeId);
  }

  listByStore(storeId: string): Promise<ScenarioExecution[]> {
    return this.scenarioExecutionRepository.listByStore(storeId);
  }

  create(input: CreateScenarioExecutionInput): Promise<void> {
    return this.scenarioExecutionRepository.create(input);
  }
}
