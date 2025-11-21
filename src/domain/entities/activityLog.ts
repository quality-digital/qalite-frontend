import type { AuthUser } from './auth';

export type ActivityEntityType =
  | 'organization'
  | 'store'
  | 'scenario'
  | 'suite'
  | 'environment'
  | 'environment_bug'
  | 'environment_participant';

export interface ActivityLog {
  id: string;
  organizationId: string;
  entityId: string;
  entityType: ActivityEntityType;
  action: 'create' | 'update' | 'delete' | 'status_change' | 'attachment' | 'participation';
  message: string;
  actorId: string | null;
  actorName: string;
  createdAt: Date | null;
}

export interface ActivityLogInput {
  organizationId: string;
  entityId: string;
  entityType: ActivityEntityType;
  action: ActivityLog['action'];
  message: string;
  actor?: AuthUser | null;
}
