import type { ActivityLog, ActivityLogInput } from '../entities/activityLog';

export interface ActivityLogCursor {
  createdAt: Date;
  id: string;
}

export interface ActivityLogPage {
  logs: ActivityLog[];
  nextCursor: ActivityLogCursor | null;
}

export interface LogRepository {
  record: (input: ActivityLogInput) => Promise<void>;
  listByOrganization: (organizationId: string) => Promise<ActivityLog[]>;
  listByOrganizationPage: (
    organizationId: string,
    pageSize: number,
    cursor?: ActivityLogCursor | null,
  ) => Promise<ActivityLogPage>;
}
