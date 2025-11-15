import type { IStoreRepository } from '../repositories/StoreRepository';

export class DeleteStore {
  constructor(private readonly storeRepository: IStoreRepository) {}

  execute(storeId: string): Promise<void> {
    return this.storeRepository.deleteStore(storeId);
  }
}
