export type EnvironmentStatus = 'backlog' | 'in_progress' | 'done';

export type EnvironmentScenarioStatus = 'pendente' | 'em_andamento' | 'concluido';

export interface EnvironmentScenario {
  titulo: string;
  categoria: string;
  criticidade: string;
  status: EnvironmentScenarioStatus;
  evidenciaTexto: string;
  evidenciaArquivoUrl: string;
}

export interface EnvironmentTimeTracking {
  start: string | null;
  end: string | null;
  totalMs: number;
}

export interface Environment {
  id: string;
  identificador: string;
  loja: string;
  urls: string[];
  jiraTask: string;
  tipoAmbiente: string;
  tipoTeste: string;
  status: EnvironmentStatus;
  createdAt: string | null;
  updatedAt: string | null;
  timeTracking: EnvironmentTimeTracking;
  presentUsersIds: string[];
  scenarios: Record<string, EnvironmentScenario>;
  bugs: number;
  totalCenarios: number;
}

export interface CreateEnvironmentInput {
  identificador: string;
  loja: string;
  urls: string[];
  jiraTask: string;
  tipoAmbiente: string;
  tipoTeste: string;
  status: EnvironmentStatus;
  timeTracking: EnvironmentTimeTracking;
  presentUsersIds: string[];
  scenarios: Record<string, EnvironmentScenario>;
  bugs: number;
  totalCenarios: number;
}

export type UpdateEnvironmentInput = Partial<Omit<Environment, 'id'>>;

export interface EnvironmentScenarioUpdate {
  status?: EnvironmentScenarioStatus;
  evidenciaTexto?: string;
  evidenciaArquivoUrl?: string;
}
