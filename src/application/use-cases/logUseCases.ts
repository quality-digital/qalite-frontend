import type { LogRepository } from '../../domain/repositories/LogRepository';
import type { ActivityLog, ActivityLogInput } from '../../domain/entities/activityLog';

export class LogUseCases {
  constructor(private readonly logRepository: LogRepository) {}

  record(input: ActivityLogInput): Promise<void> {
    return this.logRepository.record(input);
  }

  listByOrganization(organizationId: string): Promise<ActivityLog[]> {
    return this.logRepository.listByOrganization(organizationId);
  }
}
