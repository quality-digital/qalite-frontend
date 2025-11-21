import { slackIntegrationRepository } from '../../infrastructure/repositories/firebaseSlackRepository';
import { SlackUseCases } from './slackUseCases';

export const slackUseCases = new SlackUseCases(slackIntegrationRepository);
export const slackService = slackUseCases;
