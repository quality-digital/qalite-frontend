import type { SlackRepository } from '../../domain/repositories/SlackRepository';
import type { SlackTaskSummaryDTO } from '../dto/SlackDto';
import { slackIntegrationRepository } from '../../infrastructure/repositories/firebaseSlackRepository';

export class SlackUseCases {
  constructor(private readonly slackRepository: SlackRepository) {}

  sendTaskSummary(payload: SlackTaskSummaryDTO): Promise<void> {
    return this.slackRepository.sendTaskSummary(payload);
  }
}

export const slackUseCases = new SlackUseCases(slackIntegrationRepository);
export const slackService = slackUseCases;
