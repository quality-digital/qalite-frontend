export interface ScenarioExecution {
  id: string;
  organizationId: string;
  storeId: string;
  environmentId: string;
  scenarioId: string;
  scenarioTitle: string;
  qaId: string | null;
  qaName: string | null;
  totalMs: number;
  executedAt: string;
  createdAt: string | null;
}

export interface CreateScenarioExecutionInput {
  organizationId: string;
  storeId: string;
  environmentId: string;
  scenarioId: string;
  scenarioTitle: string;
  qaId: string | null;
  qaName: string | null;
  totalMs: number;
  executedAt: string;
}

export interface ScenarioAverageEntry {
  scenarioId: string | null;
  scenarioTitle: string;
  executions: number;
  averageMs: number;
  bestMs: number;
}

export type ScenarioAverageMap = Record<string, ScenarioAverageEntry>;
