import type { ScenarioExecutionRepository } from '../../domain/repositories/ScenarioExecutionRepository';
import type {
  CreateScenarioExecutionDTO,
  ScenarioAverageMapDTO,
  ScenarioExecutionDTO,
} from '../dto/ScenarioExecutionDto';
import { firebaseScenarioExecutionRepository } from '../../infrastructure/repositories/firebaseScenarioExecutionRepository';

export class ScenarioExecutionUseCases {
  constructor(private readonly scenarioExecutionRepository: ScenarioExecutionRepository) {}

  logExecution(input: CreateScenarioExecutionDTO): Promise<void> {
    return this.scenarioExecutionRepository.logExecution(input);
  }

  getStoreScenarioAverages(storeId: string): Promise<ScenarioAverageMapDTO> {
    return this.scenarioExecutionRepository.getStoreScenarioAverages(storeId);
  }

  listByStore(storeId: string): Promise<ScenarioExecutionDTO[]> {
    return this.scenarioExecutionRepository.listByStore(storeId);
  }

  create(input: CreateScenarioExecutionDTO): Promise<void> {
    return this.scenarioExecutionRepository.create(input);
  }
}

export const scenarioExecutionUseCases = new ScenarioExecutionUseCases(
  firebaseScenarioExecutionRepository,
);
export const scenarioExecutionService = scenarioExecutionUseCases;
