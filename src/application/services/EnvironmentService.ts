import {
  SCENARIO_COMPLETED_STATUSES,
  getScenarioPlatformStatuses,
  type CreateEnvironmentInput,
  type Environment,
  type EnvironmentScenario,
  type EnvironmentScenarioPlatform,
  type EnvironmentScenarioStatus,
  type EnvironmentStatus,
  type EnvironmentTimeTracking,
  type UpdateEnvironmentInput,
} from '../../domain/entities/Environment';
import type {
  CreateEnvironmentBugInput,
  EnvironmentBug,
  UpdateEnvironmentBugInput,
} from '../../domain/entities/EnvironmentBug';
import type {
  EnvironmentRealtimeFilters,
  IEnvironmentRepository,
} from '../../domain/repositories/EnvironmentRepository';
import { EnvironmentStatusError } from '../errors/EnvironmentStatusError';
import type { EnvironmentExporter } from '../ports/EnvironmentExporter';
import type { UserSummary } from '../../domain/entities/UserSummary';

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
    platform?: EnvironmentScenarioPlatform,
  ): Promise<void> {
    return this.environmentRepository.updateScenarioStatus(
      environmentId,
      scenarioId,
      status,
      platform,
    );
  }

  observeBugs(environmentId: string, callback: (bugs: EnvironmentBug[]) => void): () => void {
    return this.environmentRepository.observeBugs(environmentId, callback);
  }

  createBug(environmentId: string, payload: CreateEnvironmentBugInput): Promise<EnvironmentBug> {
    return this.environmentRepository.createBug(environmentId, payload);
  }

  updateBug(
    environmentId: string,
    bugId: string,
    payload: UpdateEnvironmentBugInput,
  ): Promise<void> {
    return this.environmentRepository.updateBug(environmentId, bugId, payload);
  }

  deleteBug(environmentId: string, bugId: string): Promise<void> {
    return this.environmentRepository.deleteBug(environmentId, bugId);
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
      const hasIncompleteScenario = Object.values(environment.scenarios ?? {}).some((scenario) => {
        const statuses = getScenarioPlatformStatuses(scenario);
        return (
          this.isIncompleteStatus(statuses.mobile) || this.isIncompleteStatus(statuses.desktop)
        );
      });

      if (hasIncompleteScenario) {
        throw new EnvironmentStatusError(
          'PENDING_SCENARIOS',
          'There are pending or in-progress scenarios that must be completed before finishing the environment.',
        );
      }
    }

    const nextTimeTracking = this.computeNextTimeTracking(environment.timeTracking, targetStatus);
    const payload: UpdateEnvironmentInput = {
      status: targetStatus,
      timeTracking: nextTimeTracking,
    };

    if (targetStatus === 'in_progress') {
      const scenariosEntries = Object.entries(environment.scenarios ?? {});

      if (scenariosEntries.length > 0) {
        const scenarios = scenariosEntries.reduce<Record<string, EnvironmentScenario>>(
          (acc, [scenarioId, scenario]) => {
            acc[scenarioId] = {
              ...scenario,
              status: 'em_andamento',
              statusMobile: 'em_andamento',
              statusDesktop: 'em_andamento',
            };
            return acc;
          },
          {},
        );

        payload.scenarios = scenarios;
      }
    }

    if (targetStatus === 'done') {
      const uniqueParticipants = Array.from(
        new Set([...(environment.participants ?? []), ...(environment.presentUsersIds ?? [])]),
      );
      payload.concludedBy = currentUserId ?? null;
      payload.participants = uniqueParticipants;
    }

    await this.environmentRepository.update(environment.id, payload);
  }

  exportAsPDF(
    environment: Environment,
    bugs?: EnvironmentBug[],
    participants?: UserSummary[],
  ): void {
    this.environmentExporter.exportAsPDF(environment, bugs, participants);
  }

  copyAsMarkdown(
    environment: Environment,
    bugs?: EnvironmentBug[],
    participants?: UserSummary[],
  ): Promise<void> {
    return this.environmentExporter.copyAsMarkdown(environment, bugs, participants);
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

  private isIncompleteStatus(status: EnvironmentScenarioStatus): boolean {
    return !SCENARIO_COMPLETED_STATUSES.includes(status);
  }
}
