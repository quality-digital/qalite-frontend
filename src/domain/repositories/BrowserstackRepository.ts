import type { BrowserstackBuild, BrowserstackCredentials } from '../entities/browserstack';

export interface BrowserstackRepository {
  listBuilds: (credentials: BrowserstackCredentials) => Promise<BrowserstackBuild[]>;
}
