import type { StoreScenario } from '../entities/Store';
import type { IStoreRepository } from '../repositories/StoreRepository';

export class ListStoreScenarios {
  constructor(private readonly storeRepository: IStoreRepository) {}

  execute(storeId: string): Promise<StoreScenario[]> {
    return this.storeRepository.listScenarios(storeId);
  }
}
