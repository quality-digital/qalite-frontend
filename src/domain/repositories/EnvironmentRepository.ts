import type {
  CreateEnvironmentInput,
  Environment,
  EnvironmentScenarioStatus,
  UpdateEnvironmentInput,
} from '../entities/Environment';

export interface EnvironmentRealtimeFilters {
  storeId?: string;
}

export interface IEnvironmentRepository {
  create(payload: CreateEnvironmentInput): Promise<Environment>;
  update(environmentId: string, payload: UpdateEnvironmentInput): Promise<void>;
  delete(environmentId: string): Promise<void>;
  observeById(
    environmentId: string,
    callback: (environment: Environment | null) => void,
  ): () => void;
  observeAll(
    filters: EnvironmentRealtimeFilters,
    callback: (environments: Environment[]) => void,
  ): () => void;
  addUser(environmentId: string, userId: string): Promise<void>;
  removeUser(environmentId: string, userId: string): Promise<void>;
  updateScenarioStatus(
    environmentId: string,
    scenarioId: string,
    status: EnvironmentScenarioStatus,
  ): Promise<void>;
  uploadScenarioEvidence(environmentId: string, scenarioId: string, file: File): Promise<string>;
}
