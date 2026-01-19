import type { LogRepository } from '../../domain/repositories/LogRepository';
import { listOrganizationLogs, listOrganizationLogsPage, logActivity } from '../external/logs';

export const firebaseLogRepository: LogRepository = {
  record: logActivity,
  listByOrganization: listOrganizationLogs,
  listByOrganizationPage: listOrganizationLogsPage,
};
