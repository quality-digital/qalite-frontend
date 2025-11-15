import type { ImportScenariosResult } from '../repositories/StoreRepository';
import type { StoreScenarioInput } from '../entities/Store';
import type { IStoreRepository } from '../repositories/StoreRepository';

export class MergeStoreScenarios {
  constructor(private readonly storeRepository: IStoreRepository) {}

  execute(storeId: string, scenarios: StoreScenarioInput[]): Promise<ImportScenariosResult> {
    return this.storeRepository.mergeScenarios(storeId, scenarios);
  }
}
