import type { IStoreRepository } from '../repositories/StoreRepository';

export class DeleteStoreCategory {
  constructor(private readonly storeRepository: IStoreRepository) {}

  execute(storeId: string, categoryId: string): Promise<void> {
    return this.storeRepository.deleteCategory(storeId, categoryId);
  }
}
