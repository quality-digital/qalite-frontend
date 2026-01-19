import type {
  ActivityLogPage,
  ActivityLogCursor,
  LogRepository,
} from '../../domain/repositories/LogRepository';
import type { ActivityLog, ActivityLogInput } from '../../domain/entities/activityLog';
import { firebaseLogRepository } from '../../infrastructure/repositories/firebaseLogRepository';

export class LogUseCases {
  constructor(private readonly logRepository: LogRepository) {}

  record(input: ActivityLogInput): Promise<void> {
    return this.logRepository.record(input);
  }

  listByOrganization(organizationId: string): Promise<ActivityLog[]> {
    return this.logRepository.listByOrganization(organizationId);
  }

  listByOrganizationPage(
    organizationId: string,
    pageSize: number,
    cursor?: ActivityLogCursor | null,
  ): Promise<ActivityLogPage> {
    return this.logRepository.listByOrganizationPage(organizationId, pageSize, cursor);
  }
}

export const logService = new LogUseCases(firebaseLogRepository);
