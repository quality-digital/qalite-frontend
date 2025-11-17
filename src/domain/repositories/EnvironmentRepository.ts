import type {
  CreateEnvironmentInput,
  Environment,
  EnvironmentScenarioPlatform,
  EnvironmentScenarioStatus,
  UpdateEnvironmentInput,
} from '../entities/Environment';
import type {
  CreateEnvironmentBugInput,
  EnvironmentBug,
  UpdateEnvironmentBugInput,
} from '../entities/EnvironmentBug';

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
    platform?: EnvironmentScenarioPlatform,
  ): Promise<void>;
  uploadScenarioEvidence(environmentId: string, scenarioId: string, file: File): Promise<string>;
  observeBugs(environmentId: string, callback: (bugs: EnvironmentBug[]) => void): () => void;
  createBug(environmentId: string, payload: CreateEnvironmentBugInput): Promise<EnvironmentBug>;
  updateBug(
    environmentId: string,
    bugId: string,
    payload: UpdateEnvironmentBugInput,
  ): Promise<void>;
  deleteBug(environmentId: string, bugId: string): Promise<void>;
}
