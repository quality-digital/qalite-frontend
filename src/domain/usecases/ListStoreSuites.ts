import type { StoreSuite } from '../entities/Store';
import type { IStoreRepository } from '../repositories/StoreRepository';

export class ListStoreSuites {
  constructor(private readonly storeRepository: IStoreRepository) {}

  execute(storeId: string): Promise<StoreSuite[]> {
    return this.storeRepository.listSuites(storeId);
  }
}
