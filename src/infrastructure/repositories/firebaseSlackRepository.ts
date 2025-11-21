import type { SlackRepository } from '../../domain/repositories/SlackRepository';
import { sendEnvironmentSummaryToSlack } from '../external/slack';

export const slackIntegrationRepository: SlackRepository = {
  sendTaskSummary: sendEnvironmentSummaryToSlack,
};
