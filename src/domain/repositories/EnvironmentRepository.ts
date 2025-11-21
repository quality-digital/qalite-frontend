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
  UserSummary,
} from '../entities/types';

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
    evidence: File,
    platform?: EnvironmentScenarioPlatform,
  ) => Promise<string>;
  observeBugs: (environmentId: string, onChange: (bugs: EnvironmentBug[]) => void) => () => void;
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
  ) => void;
  copyAsMarkdown: (
    environment: Environment,
    bugs?: EnvironmentBug[],
    participantProfiles?: UserSummary[],
  ) => Promise<void>;
}
