export type EnvironmentStatus = 'backlog' | 'in_progress' | 'done';

export type EnvironmentScenarioStatus =
  | 'pendente'
  | 'em_andamento'
  | 'concluido'
  | 'concluido_automatizado'
  | 'nao_se_aplica';

export interface EnvironmentScenario {
  titulo: string;
  categoria: string;
  criticidade: string;
  status: EnvironmentScenarioStatus;
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
  urls: string[];
  jiraTask: string;
  tipoAmbiente: string;
  tipoTeste: string;
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
  urls: string[];
  jiraTask: string;
  tipoAmbiente: string;
  tipoTeste: string;
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
}
