import type { StoreCategory } from '../entities/Store';
import type { IStoreRepository, UpdateStoreCategoryPayload } from '../repositories/StoreRepository';

export class UpdateStoreCategory {
  constructor(private readonly storeRepository: IStoreRepository) {}

  execute(
    storeId: string,
    categoryId: string,
    payload: UpdateStoreCategoryPayload,
  ): Promise<StoreCategory> {
    return this.storeRepository.updateCategory(storeId, categoryId, payload);
  }
}
