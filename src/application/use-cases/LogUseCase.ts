import type { LogRepository } from '../../domain/repositories/LogRepository';
import type { ActivityLogDTO, ActivityLogInputDTO } from '../dto/ActivityLogDto';
import { firebaseLogRepository } from '../../infrastructure/repositories/firebaseLogRepository';

export class LogUseCases {
  constructor(private readonly logRepository: LogRepository) {}

  record(input: ActivityLogInputDTO): Promise<void> {
    return this.logRepository.record(input);
  }

  listByOrganization(organizationId: string): Promise<ActivityLogDTO[]> {
    return this.logRepository.listByOrganization(organizationId);
  }
}

export const logUseCases = new LogUseCases(firebaseLogRepository);
export const logService = logUseCases;
