import type { SlackTaskSummaryPayload } from '../entities/slack';

export interface SlackRepository {
  sendTaskSummary: (payload: SlackTaskSummaryPayload) => Promise<void>;
}
