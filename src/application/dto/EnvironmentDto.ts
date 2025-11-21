import type {
  CreateEnvironmentBugInput,
  CreateEnvironmentInput,
  Environment,
  EnvironmentBug,
  EnvironmentBugStatus,
  EnvironmentRealtimeFilters,
  EnvironmentScenario,
  EnvironmentScenarioPlatform,
  EnvironmentScenarioStatus,
  EnvironmentStatus,
  TransitionEnvironmentStatusParams,
  UpdateEnvironmentBugInput,
  UpdateEnvironmentInput,
} from '../../domain/entities/environment';
import type { UserSummary } from '../../domain/entities/user';

export type EnvironmentDTO = Environment;
export type EnvironmentStatusDTO = EnvironmentStatus;
export type EnvironmentScenarioDTO = EnvironmentScenario;
export type EnvironmentBugDTO = EnvironmentBug;
export type EnvironmentBugStatusDTO = EnvironmentBugStatus;
export type EnvironmentRealtimeFiltersDTO = EnvironmentRealtimeFilters;
export type EnvironmentScenarioStatusDTO = EnvironmentScenarioStatus;
export type EnvironmentScenarioPlatformDTO = EnvironmentScenarioPlatform;

export type CreateEnvironmentDTO = CreateEnvironmentInput;
export type UpdateEnvironmentDTO = UpdateEnvironmentInput;
export type CreateEnvironmentBugDTO = CreateEnvironmentBugInput;
export type UpdateEnvironmentBugDTO = UpdateEnvironmentBugInput;
export type TransitionEnvironmentStatusDTO = TransitionEnvironmentStatusParams;

export interface ExportEnvironmentPayloadDTO {
  environment: Environment;
  bugs?: EnvironmentBug[];
  participantProfiles?: UserSummary[];
}
