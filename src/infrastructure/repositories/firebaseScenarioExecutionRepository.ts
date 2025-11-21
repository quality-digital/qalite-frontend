import type { ScenarioExecutionRepository } from '../../domain/repositories/ScenarioExecutionRepository';
import {
  createScenarioExecution,
  getStoreScenarioAverages,
  listScenarioExecutionsByStore,
  logScenarioExecution,
} from '../external/scenarioExecutions';

export const firebaseScenarioExecutionRepository: ScenarioExecutionRepository = {
  logExecution: logScenarioExecution,
  getStoreScenarioAverages,
  listByStore: listScenarioExecutionsByStore,
  create: createScenarioExecution,
};
