import type { StoreSuite } from '../entities/Store';
import type { IStoreRepository, UpdateStoreSuitePayload } from '../repositories/StoreRepository';

export class UpdateStoreSuite {
  constructor(private readonly storeRepository: IStoreRepository) {}

  execute(storeId: string, suiteId: string, payload: UpdateStoreSuitePayload): Promise<StoreSuite> {
    return this.storeRepository.updateSuite(storeId, suiteId, payload);
  }
}
