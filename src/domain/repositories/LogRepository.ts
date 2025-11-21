import type { ActivityLog, ActivityLogInput } from '../entities/types';

export interface LogRepository {
  record: (input: ActivityLogInput) => Promise<void>;
  listByOrganization: (organizationId: string) => Promise<ActivityLog[]>;
}
