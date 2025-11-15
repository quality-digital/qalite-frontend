import type { Store } from '../entities/Store';
import type { CreateStorePayload, IStoreRepository } from '../repositories/StoreRepository';

export class CreateStore {
  constructor(private readonly storeRepository: IStoreRepository) {}

  execute(payload: CreateStorePayload): Promise<Store> {
    return this.storeRepository.createStore(payload);
  }
}
