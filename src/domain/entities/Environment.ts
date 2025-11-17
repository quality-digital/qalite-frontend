export type EnvironmentStatus = 'backlog' | 'in_progress' | 'done';

export type EnvironmentScenarioStatus =
  | 'pendente'
  | 'em_andamento'
  | 'concluido'
  | 'concluido_automatizado'
  | 'nao_se_aplica';

export type EnvironmentScenarioPlatform = 'mobile' | 'desktop';

export interface EnvironmentScenario {
  titulo: string;
  categoria: string;
  criticidade: string;
  automatizado?: string;
  status: EnvironmentScenarioStatus;
  statusMobile?: EnvironmentScenarioStatus;
  statusDesktop?: EnvironmentScenarioStatus;
  evidenciaArquivoUrl: string | null;
  bugUrl?: string | null;
}

export const SCENARIO_COMPLETED_STATUSES: EnvironmentScenarioStatus[] = [
  'concluido',
  'concluido_automatizado',
  'nao_se_aplica',
];

export const getScenarioPlatformStatuses = (
  scenario: EnvironmentScenario,
): Record<EnvironmentScenarioPlatform, EnvironmentScenarioStatus> => ({
  mobile: scenario.statusMobile ?? scenario.status,
  desktop: scenario.statusDesktop ?? scenario.status,
});

export interface EnvironmentTimeTracking {
  start: string | null;
  end: string | null;
  totalMs: number;
}

export interface Environment {
  id: string;
  identificador: string;
  storeId: string;
  suiteId: string | null;
  suiteName: string | null;
  urls: string[];
  jiraTask: string;
  tipoAmbiente: string;
  tipoTeste: string;
  momento: string | null;
  release: string | null;
  status: EnvironmentStatus;
  createdAt: string | null;
  updatedAt: string | null;
  timeTracking: EnvironmentTimeTracking;
  presentUsersIds: string[];
  concludedBy: string | null;
  scenarios: Record<string, EnvironmentScenario>;
  bugs: number;
  totalCenarios: number;
  participants: string[];
}

export interface CreateEnvironmentInput {
  identificador: string;
  storeId: string;
  suiteId: string | null;
  suiteName: string | null;
  urls: string[];
  jiraTask: string;
  tipoAmbiente: string;
  tipoTeste: string;
  momento: string | null;
  release: string | null;
  status: EnvironmentStatus;
  timeTracking: EnvironmentTimeTracking;
  presentUsersIds: string[];
  concludedBy: string | null;
  scenarios: Record<string, EnvironmentScenario>;
  bugs: number;
  totalCenarios: number;
  participants: string[];
}

export type UpdateEnvironmentInput = Partial<Omit<Environment, 'id'>>;

export interface EnvironmentScenarioUpdate {
  status?: EnvironmentScenarioStatus;
  evidenciaArquivoUrl?: string | null;
  bugUrl?: string | null;
}
