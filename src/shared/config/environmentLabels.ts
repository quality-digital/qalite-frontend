import type {
  EnvironmentBug,
  EnvironmentBugPriority,
  EnvironmentBugSeverity,
  EnvironmentStatus,
} from '../../domain/entities/environment';

export const ENVIRONMENT_STATUS_LABEL: Record<EnvironmentStatus, string> = {
  backlog: 'environmentLabels.backlog',
  in_progress: 'environmentLabels.progress',
  done: 'environmentLabels.done',
};

export const BUG_STATUS_LABEL: Record<EnvironmentBug['status'], string> = {
  aberto: 'environmentLabels.open',
  em_andamento: 'environmentLabels.progress',
  resolvido: 'environmentLabels.resolved',
};

export const BUG_SEVERITY_LABEL: Record<EnvironmentBugSeverity, string> = {
  baixa: 'environmentBugSeverity.low',
  media: 'environmentBugSeverity.medium',
  alta: 'environmentBugSeverity.high',
  critica: 'environmentBugSeverity.critical',
};

export const BUG_PRIORITY_LABEL: Record<EnvironmentBugPriority, string> = {
  baixa: 'environmentBugPriority.low',
  media: 'environmentBugPriority.medium',
  alta: 'environmentBugPriority.high',
  urgente: 'environmentBugPriority.urgent',
};
