import type {
  CreateScenarioExecutionInput,
  ScenarioExecution,
} from '../../domain/entities/ScenarioExecution';
import type { IScenarioExecutionRepository } from '../../domain/repositories/ScenarioExecutionRepository';

export interface ScenarioAverageEntry {
  scenarioId: string | null;
  scenarioTitle: string;
  executions: number;
  averageMs: number;
  bestMs: number;
}

export type ScenarioAverageMap = Record<string, ScenarioAverageEntry>;

export class ScenarioExecutionService {
  constructor(private readonly repository: IScenarioExecutionRepository) {}

  logExecution(payload: CreateScenarioExecutionInput): Promise<void> {
    if (!payload.organizationId) {
      throw new Error('Organização inválida para registrar o tempo do cenário.');
    }

    return this.repository.create(payload);
  }

  async getStoreScenarioAverages(storeId: string): Promise<ScenarioAverageMap> {
    if (!storeId) {
      throw new Error('Loja inválida para consultar métricas.');
    }

    const executions = await this.repository.listByStore(storeId);
    return this.buildScenarioAverageMap(executions);
  }

  private buildScenarioAverageMap(executions: ScenarioExecution[]): ScenarioAverageMap {
    const map = new Map<string, { entry: ScenarioAverageEntry; totalMs: number }>();

    executions.forEach((execution) => {
      const key = execution.scenarioId || `${execution.scenarioTitle}-${execution.environmentId}`;
      const title = execution.scenarioTitle?.trim() || 'Cenário';
      const existing = key ? map.get(key) : undefined;

      if (!existing) {
        map.set(key, {
          entry: {
            scenarioId: execution.scenarioId || null,
            scenarioTitle: title,
            executions: 1,
            averageMs: execution.totalMs,
            bestMs: execution.totalMs,
          },
          totalMs: execution.totalMs,
        });
        return;
      }

      existing.entry.executions += 1;
      existing.totalMs += execution.totalMs;
      existing.entry.bestMs = Math.min(existing.entry.bestMs, execution.totalMs);
      existing.entry.averageMs = existing.totalMs / existing.entry.executions;
    });

    return Array.from(map.entries()).reduce<ScenarioAverageMap>((accumulator, [key, value]) => {
      accumulator[key] = value.entry;
      return accumulator;
    }, {});
  }
}
