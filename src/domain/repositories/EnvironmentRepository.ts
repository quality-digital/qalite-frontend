import type {
  CreateEnvironmentInput,
  Environment,
  EnvironmentRealtimeFilters,
  EnvironmentScenarioPlatform,
  EnvironmentScenarioStatus,
  TransitionEnvironmentStatusParams,
  UpdateEnvironmentInput,
} from '../entities/environment';
import type { UserSummary } from '../entities/user';

export interface EnvironmentRepository {
  create: (input: CreateEnvironmentInput) => Promise<Environment>;
  update: (id: string, input: UpdateEnvironmentInput) => Promise<void>;
  delete: (id: string) => Promise<void>;
  observeEnvironment: (
    id: string,
    onChange: (environment: Environment | null) => void,
  ) => () => void;
  observeAll: (
    filters: EnvironmentRealtimeFilters,
    onChange: (environments: Environment[]) => void,
  ) => () => void;
  listSummary: (filters: EnvironmentRealtimeFilters) => Promise<Environment[]>;
  addUser: (id: string, userId: string) => Promise<void>;
  removeUser: (id: string, userId: string) => Promise<void>;
  updateScenarioStatus: (
    environmentId: string,
    scenarioId: string,
    status: EnvironmentScenarioStatus,
    platform?: EnvironmentScenarioPlatform,
  ) => Promise<void>;
  uploadScenarioEvidence: (
    environmentId: string,
    scenarioId: string,
    evidenceLink: string | File,
  ) => Promise<string>;
  transitionStatus: (params: TransitionEnvironmentStatusParams) => Promise<void>;
  exportAsPDF: (
    environment: Environment,
    participantProfiles?: UserSummary[],
    store?: { name?: string | null } | null,
    organization?: { name?: string | null; logoUrl?: string | null } | null,
  ) => void;
  copyAsMarkdown: (
    environment: Environment,
    participantProfiles?: UserSummary[],
    storeName?: string,
  ) => Promise<void>;
}
