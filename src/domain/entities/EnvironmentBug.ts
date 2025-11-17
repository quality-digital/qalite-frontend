export type EnvironmentBugStatus = 'aberto' | 'em_andamento' | 'resolvido';

export interface EnvironmentBug {
  id: string;
  scenarioId: string | null;
  title: string;
  description: string | null;
  status: EnvironmentBugStatus;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface CreateEnvironmentBugInput {
  scenarioId: string | null;
  title: string;
  description: string | null;
  status: EnvironmentBugStatus;
}

export type UpdateEnvironmentBugInput = Partial<Omit<EnvironmentBug, 'id'>>;
