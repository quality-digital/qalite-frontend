import type {
  CreateEnvironmentInput,
  Environment,
  EnvironmentScenarioStatus,
  EnvironmentStatus,
  EnvironmentTimeTracking,
  UpdateEnvironmentInput,
} from '../../domain/entities/Environment';
import type {
  EnvironmentRealtimeFilters,
  IEnvironmentRepository,
} from '../../domain/repositories/EnvironmentRepository';
import { EnvironmentStatusError } from '../errors/EnvironmentStatusError';
import type { EnvironmentExporter } from '../ports/EnvironmentExporter';

interface TransitionEnvironmentStatusParams {
  environment: Environment;
  targetStatus: EnvironmentStatus;
  currentUserId?: string | null;
}

export class EnvironmentService {
  constructor(
    private readonly environmentRepository: IEnvironmentRepository,
    private readonly environmentExporter: EnvironmentExporter,
  ) {}

  create(payload: CreateEnvironmentInput): Promise<Environment> {
    return this.environmentRepository.create(payload);
  }

  update(environmentId: string, payload: UpdateEnvironmentInput): Promise<void> {
    return this.environmentRepository.update(environmentId, payload);
  }

  delete(environmentId: string): Promise<void> {
    return this.environmentRepository.delete(environmentId);
  }

  observeEnvironment(
    environmentId: string,
    callback: (environment: Environment | null) => void,
  ): () => void {
    return this.environmentRepository.observeById(environmentId, callback);
  }

  observeAll(
    filters: EnvironmentRealtimeFilters,
    callback: (environments: Environment[]) => void,
  ): () => void {
    return this.environmentRepository.observeAll(filters, callback);
  }

  addUser(environmentId: string, userId: string): Promise<void> {
    return this.environmentRepository.addUser(environmentId, userId);
  }

  removeUser(environmentId: string, userId: string): Promise<void> {
    return this.environmentRepository.removeUser(environmentId, userId);
  }

  updateScenarioStatus(
    environmentId: string,
    scenarioId: string,
    status: EnvironmentScenarioStatus,
  ): Promise<void> {
    return this.environmentRepository.updateScenarioStatus(environmentId, scenarioId, status);
  }

  uploadScenarioEvidence(environmentId: string, scenarioId: string, file: File): Promise<string> {
    return this.environmentRepository.uploadScenarioEvidence(environmentId, scenarioId, file);
  }

  async transitionStatus({
    environment,
    targetStatus,
    currentUserId,
  }: TransitionEnvironmentStatusParams): Promise<void> {
    if (!environment) {
      throw new EnvironmentStatusError('INVALID_ENVIRONMENT', 'Environment not found.');
    }

    if (environment.status === targetStatus) {
      return;
    }

    if (targetStatus === 'done') {
      const hasPendingScenario = Object.values(environment.scenarios ?? {}).some(
        (scenario) => scenario.status === 'pendente',
      );

      if (hasPendingScenario) {
        throw new EnvironmentStatusError(
          'PENDING_SCENARIOS',
          'There are pending scenarios that must be completed before finishing the environment.',
        );
      }
    }

    const nextTimeTracking = this.computeNextTimeTracking(environment.timeTracking, targetStatus);
    const payload: UpdateEnvironmentInput = {
      status: targetStatus,
      timeTracking: nextTimeTracking,
    };

    if (targetStatus === 'done') {
      const uniqueParticipants = Array.from(
        new Set([...(environment.participants ?? []), ...(environment.presentUsersIds ?? [])]),
      );
      payload.presentUsersIds = [];
      payload.concludedBy = currentUserId ?? null;
      payload.participants = uniqueParticipants;
    }

    await this.environmentRepository.update(environment.id, payload);
  }

  exportAsPDF(environment: Environment): void {
    this.environmentExporter.exportAsPDF(environment);
  }

  exportAsMarkdown(environment: Environment): void {
    this.environmentExporter.exportAsMarkdown(environment);
  }

  private computeNextTimeTracking(
    current: EnvironmentTimeTracking,
    targetStatus: EnvironmentStatus,
  ): EnvironmentTimeTracking {
    const now = new Date().toISOString();

    if (targetStatus === 'backlog') {
      return { start: null, end: null, totalMs: 0 };
    }

    if (targetStatus === 'in_progress') {
      return { start: current.start ?? now, end: null, totalMs: current.totalMs };
    }

    if (targetStatus === 'done') {
      const startTimestamp = current.start ? new Date(current.start).getTime() : Date.now();
      const totalMs = current.totalMs + Math.max(0, Date.now() - startTimestamp);
      return { start: current.start ?? now, end: now, totalMs };
    }

    return current;
  }
}
