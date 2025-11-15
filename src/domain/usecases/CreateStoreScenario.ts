import type { StoreScenario } from '../entities/Store';
import type { CreateStoreScenarioPayload, IStoreRepository } from '../repositories/StoreRepository';

export class CreateStoreScenario {
  constructor(private readonly storeRepository: IStoreRepository) {}

  execute(payload: CreateStoreScenarioPayload): Promise<StoreScenario> {
    return this.storeRepository.createScenario(payload);
  }
}
