import type { StoreScenario } from '../entities/Store';
import type { IStoreRepository, UpdateStoreScenarioPayload } from '../repositories/StoreRepository';

export class UpdateStoreScenario {
  constructor(private readonly storeRepository: IStoreRepository) {}

  execute(storeId: string, scenarioId: string, payload: UpdateStoreScenarioPayload): Promise<StoreScenario> {
    return this.storeRepository.updateScenario(storeId, scenarioId, payload);
  }
}
