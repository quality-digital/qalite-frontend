import type { LogRepository } from '../../domain/repositories/LogRepository';
import { listOrganizationLogs, logActivity } from '../external/logs';

export const firebaseLogRepository: LogRepository = {
  record: logActivity,
  listByOrganization: listOrganizationLogs,
};
