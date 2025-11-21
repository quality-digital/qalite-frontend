import type { EnvironmentRepository } from '../../domain/repositories/EnvironmentRepository';
import type {
  CreateEnvironmentBugDTO,
  CreateEnvironmentDTO,
  EnvironmentBugDTO,
  EnvironmentDTO,
  EnvironmentRealtimeFiltersDTO,
  EnvironmentScenarioPlatformDTO,
  EnvironmentScenarioStatusDTO,
  ExportEnvironmentPayloadDTO,
  TransitionEnvironmentStatusDTO,
  UpdateEnvironmentBugDTO,
  UpdateEnvironmentDTO,
} from '../dto/EnvironmentDto';
import { firebaseEnvironmentRepository } from '../../infrastructure/repositories/firebaseEnvironmentRepository';

export class EnvironmentUseCases {
  constructor(private readonly environmentRepository: EnvironmentRepository) {}

  create(input: CreateEnvironmentDTO): Promise<EnvironmentDTO> {
    return this.environmentRepository.create(input);
  }

  update(id: string, input: UpdateEnvironmentDTO): Promise<void> {
    return this.environmentRepository.update(id, input);
  }

  delete(id: string): Promise<void> {
    return this.environmentRepository.delete(id);
  }

  observeEnvironment(
    id: string,
    onChange: (environment: EnvironmentDTO | null) => void,
  ): () => void {
    return this.environmentRepository.observeEnvironment(id, onChange);
  }

  observeAll(
    filters: EnvironmentRealtimeFiltersDTO,
    onChange: (environments: EnvironmentDTO[]) => void,
  ): () => void {
    return this.environmentRepository.observeAll(filters, onChange);
  }

  addUser(id: string, userId: string): Promise<void> {
    return this.environmentRepository.addUser(id, userId);
  }

  removeUser(id: string, userId: string): Promise<void> {
    return this.environmentRepository.removeUser(id, userId);
  }

  updateScenarioStatus(
    environmentId: string,
    scenarioId: string,
    status: EnvironmentScenarioStatusDTO,
    platform?: EnvironmentScenarioPlatformDTO,
  ): Promise<void> {
    return this.environmentRepository.updateScenarioStatus(
      environmentId,
      scenarioId,
      status,
      platform,
    );
  }

  uploadScenarioEvidence(
    environmentId: string,
    scenarioId: string,
    evidence: File,
    platform?: EnvironmentScenarioPlatformDTO,
  ): Promise<string> {
    return this.environmentRepository.uploadScenarioEvidence(
      environmentId,
      scenarioId,
      evidence,
      platform,
    );
  }

  observeBugs(environmentId: string, onChange: (bugs: EnvironmentBugDTO[]) => void): () => void {
    return this.environmentRepository.observeBugs(environmentId, onChange);
  }

  createBug(environmentId: string, bug: CreateEnvironmentBugDTO): Promise<EnvironmentBugDTO> {
    return this.environmentRepository.createBug(environmentId, bug);
  }

  updateBug(environmentId: string, bugId: string, input: UpdateEnvironmentBugDTO): Promise<void> {
    return this.environmentRepository.updateBug(environmentId, bugId, input);
  }

  deleteBug(environmentId: string, bugId: string): Promise<void> {
    return this.environmentRepository.deleteBug(environmentId, bugId);
  }

  transitionStatus(params: TransitionEnvironmentStatusDTO): Promise<void> {
    return this.environmentRepository.transitionStatus(params);
  }

  exportAsPDF(
    environment: EnvironmentDTO,
    bugs?: EnvironmentBugDTO[],
    participantProfiles?: ExportEnvironmentPayloadDTO['participantProfiles'],
  ): void {
    return this.environmentRepository.exportAsPDF(environment, bugs, participantProfiles);
  }

  copyAsMarkdown(
    environment: EnvironmentDTO,
    bugs?: EnvironmentBugDTO[],
    participantProfiles?: ExportEnvironmentPayloadDTO['participantProfiles'],
  ): Promise<void> {
    return this.environmentRepository.copyAsMarkdown(environment, bugs, participantProfiles);
  }
}

export const environmentUseCases = new EnvironmentUseCases(firebaseEnvironmentRepository);
export const environmentService = environmentUseCases;
