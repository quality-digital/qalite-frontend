import type { Store } from '../entities/Store';
import type { IStoreRepository, UpdateStorePayload } from '../repositories/StoreRepository';

export class UpdateStore {
  constructor(private readonly storeRepository: IStoreRepository) {}

  execute(storeId: string, payload: UpdateStorePayload): Promise<Store> {
    return this.storeRepository.updateStore(storeId, payload);
  }
}
