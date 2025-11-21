import { firebaseScenarioExecutionRepository } from '../../infrastructure/repositories/firebaseScenarioExecutionRepository';
import { ScenarioExecutionUseCases } from './scenarioExecutionUseCases';

export const scenarioExecutionUseCases = new ScenarioExecutionUseCases(
  firebaseScenarioExecutionRepository,
);
export const scenarioExecutionService = scenarioExecutionUseCases;
