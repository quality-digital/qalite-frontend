import type { IStoreRepository } from '../repositories/StoreRepository';

export class DeleteStoreSuite {
  constructor(private readonly storeRepository: IStoreRepository) {}

  execute(storeId: string, suiteId: string): Promise<void> {
    return this.storeRepository.deleteSuite(storeId, suiteId);
  }
}
