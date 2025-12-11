import type {
  EnvironmentBug,
  EnvironmentScenarioPlatform,
  EnvironmentStatus,
} from '../../domain/entities/environment';

export const ENVIRONMENT_STATUS_LABEL: Record<EnvironmentStatus, string> = {
  backlog: 'environmentLabels.backlog',
  in_progress: 'environmentLabels.progress',
  done: 'environmentLabels.done',
};

export const ENVIRONMENT_PLATFORM_LABEL: Record<EnvironmentScenarioPlatform, string> = {
  mobile: 'Mobile',
  desktop: 'Desktop',
};

export const BUG_STATUS_LABEL: Record<EnvironmentBug['status'], string> = {
  aberto: 'environmentLabels.open',
  em_andamento: 'environmentLabels.progress',
  resolvido: 'environmentLabels.resolved',
};
