import type { IStoreRepository } from '../repositories/StoreRepository';

export class DeleteStoreScenario {
  constructor(private readonly storeRepository: IStoreRepository) {}

  execute(storeId: string, scenarioId: string): Promise<void> {
    return this.storeRepository.deleteScenario(storeId, scenarioId);
  }
}
