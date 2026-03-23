import type {
  CreateEnvironmentBugInput,
  CreateEnvironmentInput,
  Environment,
  EnvironmentBug,
  EnvironmentRealtimeFilters,
  EnvironmentScenarioPlatform,
  EnvironmentScenarioStatus,
  TransitionEnvironmentStatusParams,
  UpdateEnvironmentBugInput,
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
  listBugs: (environmentId: string) => Promise<EnvironmentBug[]>;
  createBug: (environmentId: string, bug: CreateEnvironmentBugInput) => Promise<EnvironmentBug>;
  updateBug: (
    environmentId: string,
    bugId: string,
    input: UpdateEnvironmentBugInput,
  ) => Promise<void>;
  deleteBug: (environmentId: string, bugId: string) => Promise<void>;
  transitionStatus: (params: TransitionEnvironmentStatusParams) => Promise<void>;
  exportAsPDF: (
    environment: Environment,
    bugs?: EnvironmentBug[],
    participantProfiles?: UserSummary[],
<<<<<<< HEAD
    storeName?: string,
=======
    store?: { name?: string | null; logoUrl?: string | null } | null,
    organization?: { name?: string | null; logoUrl?: string | null } | null,
>>>>>>> e5493a2 (chore: update version to 72.0.1 in package.json)
  ) => void;
  copyAsMarkdown: (
    environment: Environment,
    bugs?: EnvironmentBug[],
    participantProfiles?: UserSummary[],
    storeName?: string,
  ) => Promise<void>;
}
