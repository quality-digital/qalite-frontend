import type { StoreSuite } from '../entities/Store';
import type { CreateStoreSuitePayload, IStoreRepository } from '../repositories/StoreRepository';

export class CreateStoreSuite {
  constructor(private readonly storeRepository: IStoreRepository) {}

  execute(payload: CreateStoreSuitePayload): Promise<StoreSuite> {
    return this.storeRepository.createSuite(payload);
  }
}
