import type {
  EnvironmentBug,
  EnvironmentScenarioPlatform,
  EnvironmentStatus,
} from '../../domain/entities/environment';

export const ENVIRONMENT_STATUS_LABEL: Record<EnvironmentStatus, string> = {
  backlog: 'Backlog',
  in_progress: 'Em andamento',
  done: 'Concluído',
};

export const ENVIRONMENT_PLATFORM_LABEL: Record<EnvironmentScenarioPlatform, string> = {
  mobile: 'Mobile',
  desktop: 'Desktop',
};

export const BUG_STATUS_LABEL: Record<EnvironmentBug['status'], string> = {
  aberto: 'Aberto',
  em_andamento: 'Em andamento',
  resolvido: 'Resolvido',
};
