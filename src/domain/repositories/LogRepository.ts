import type { ActivityLog, ActivityLogInput } from '../entities/activityLog';

export interface LogRepository {
  record: (input: ActivityLogInput) => Promise<void>;
  listByOrganization: (organizationId: string) => Promise<ActivityLog[]>;
}
