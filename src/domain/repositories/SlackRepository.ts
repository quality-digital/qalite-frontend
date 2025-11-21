import type { SlackTaskSummaryPayload } from '../entities/types';

export interface SlackRepository {
  sendTaskSummary: (payload: SlackTaskSummaryPayload) => Promise<void>;
}
