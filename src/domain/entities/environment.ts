export type EnvironmentStatus = 'backlog' | 'in_progress' | 'done';

export type EnvironmentScenarioStatus =
  | 'pendente'
  | 'em_andamento'
  | 'bloqueado'
  | 'concluido'
  | 'concluido_automatizado'
  | 'nao_se_aplica';

export type EnvironmentScenarioPlatform = string;

export interface EnvironmentScenario {
  titulo: string;
  categoria: string;
  criticidade: string;
  observacao: string;
  automatizado?: string;
  status: EnvironmentScenarioStatus;
  statusByEnvironment?: Record<string, EnvironmentScenarioStatus>;
  statusMobile?: EnvironmentScenarioStatus;
  statusDesktop?: EnvironmentScenarioStatus;
  evidenciaArquivoUrl: string | null;
}

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
  totalCenarios: number;
  participants: string[];
  publicShareLanguage: string | null;
  environmentColumns?: string[];
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
  totalCenarios: number;
  participants: string[];
  publicShareLanguage: string | null;
  environmentColumns?: string[];
}

export type UpdateEnvironmentInput = Partial<Omit<Environment, 'id'>>;

export interface EnvironmentScenarioUpdate {
  status?: EnvironmentScenarioStatus;
  evidenciaArquivoUrl?: string | null;
}

export interface EnvironmentRealtimeFilters {
  storeId?: string;
}

export interface TransitionEnvironmentStatusParams {
  environment: Environment;
  targetStatus: EnvironmentStatus;
  currentUserId?: string | null;
}
