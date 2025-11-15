import type { Store } from '../entities/Store';
import type { IStoreRepository } from '../repositories/StoreRepository';

export class GetStoreById {
  constructor(private readonly storeRepository: IStoreRepository) {}

  execute(storeId: string): Promise<Store | null> {
    return this.storeRepository.getById(storeId);
  }
}
