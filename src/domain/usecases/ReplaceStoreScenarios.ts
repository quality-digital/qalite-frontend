import type { StoreScenario, StoreScenarioInput } from '../entities/Store';
import type { IStoreRepository } from '../repositories/StoreRepository';

export class ReplaceStoreScenarios {
  constructor(private readonly storeRepository: IStoreRepository) {}

  execute(storeId: string, scenarios: StoreScenarioInput[]): Promise<StoreScenario[]> {
    return this.storeRepository.replaceScenarios(storeId, scenarios);
  }
}
