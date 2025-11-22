import type { BrowserstackRepository } from '../../domain/repositories/BrowserstackRepository';
import { listBrowserstackBuilds } from '../external/browserstack';

export const browserstackIntegrationRepository: BrowserstackRepository = {
  listBuilds: listBrowserstackBuilds,
};
