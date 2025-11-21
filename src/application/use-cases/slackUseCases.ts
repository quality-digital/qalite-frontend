import type { SlackRepository } from '../../domain/repositories/SlackRepository';
import type { SlackTaskSummaryPayload } from '../../domain/entities/types';

export class SlackUseCases {
  constructor(private readonly slackRepository: SlackRepository) {}

  sendTaskSummary(payload: SlackTaskSummaryPayload): Promise<void> {
    return this.slackRepository.sendTaskSummary(payload);
  }
}
