import type { SlackRepository } from '../../domain/repositories/SlackRepository';
import type { SlackTaskSummaryPayload } from '../../domain/entities/slack';
import { slackIntegrationRepository } from '../../infrastructure/repositories/firebaseSlackRepository';

export class SlackUseCases {
  constructor(private readonly slackRepository: SlackRepository) {}

  sendTaskSummary(payload: SlackTaskSummaryPayload): Promise<void> {
    return this.slackRepository.sendTaskSummary(payload);
  }
}

export const slackUseCases = new SlackUseCases(slackIntegrationRepository);
export const slackService = slackUseCases;
