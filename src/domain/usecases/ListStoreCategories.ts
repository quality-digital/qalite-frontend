import type { StoreCategory } from '../entities/Store';
import type { IStoreRepository } from '../repositories/StoreRepository';

export class ListStoreCategories {
  constructor(private readonly storeRepository: IStoreRepository) {}

  execute(storeId: string): Promise<StoreCategory[]> {
    return this.storeRepository.listCategories(storeId);
  }
}
