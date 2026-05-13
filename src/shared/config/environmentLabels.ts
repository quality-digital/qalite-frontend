import type { EnvironmentStatus } from '../../domain/entities/environment';

export const ENVIRONMENT_STATUS_LABEL: Record<EnvironmentStatus, string> = {
  backlog: 'environmentLabels.backlog',
  in_progress: 'environmentLabels.progress',
  done: 'environmentLabels.done',
};
