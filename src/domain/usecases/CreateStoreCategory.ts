import type { StoreCategory } from '../entities/Store';
import type { CreateStoreCategoryPayload, IStoreRepository } from '../repositories/StoreRepository';

export class CreateStoreCategory {
  constructor(private readonly storeRepository: IStoreRepository) {}

  execute(payload: CreateStoreCategoryPayload): Promise<StoreCategory> {
    return this.storeRepository.createCategory(payload);
  }
}
