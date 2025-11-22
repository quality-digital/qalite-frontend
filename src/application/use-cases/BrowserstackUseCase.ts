import type {
  BrowserstackBuild,
  BrowserstackCredentials,
} from '../../domain/entities/browserstack';
import type { BrowserstackRepository } from '../../domain/repositories/BrowserstackRepository';
import { browserstackIntegrationRepository } from '../../infrastructure/repositories/browserstackIntegrationRepository';

export class BrowserstackUseCases {
  constructor(private readonly browserstackRepository: BrowserstackRepository) {}

  listBuilds(credentials: BrowserstackCredentials): Promise<BrowserstackBuild[]> {
    return this.browserstackRepository.listBuilds(credentials);
  }
}

export const browserstackUseCases = new BrowserstackUseCases(browserstackIntegrationRepository);
export const browserstackService = browserstackUseCases;
