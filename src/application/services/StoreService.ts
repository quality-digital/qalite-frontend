import type { Store, StoreScenario, StoreScenarioInput } from '../../domain/entities/Store';
import { CreateStore } from '../../domain/usecases/CreateStore';
import { CreateStoreScenario } from '../../domain/usecases/CreateStoreScenario';
import { DeleteStore } from '../../domain/usecases/DeleteStore';
import { DeleteStoreScenario } from '../../domain/usecases/DeleteStoreScenario';
import { GetStoreById } from '../../domain/usecases/GetStoreById';
import { ListStoreScenarios } from '../../domain/usecases/ListStoreScenarios';
import { ListStoresByOrganization } from '../../domain/usecases/ListStoresByOrganization';
import { MergeStoreScenarios } from '../../domain/usecases/MergeStoreScenarios';
import { ReplaceStoreScenarios } from '../../domain/usecases/ReplaceStoreScenarios';
import { UpdateStore } from '../../domain/usecases/UpdateStore';
import { UpdateStoreScenario } from '../../domain/usecases/UpdateStoreScenario';
import type { CreateStorePayload, UpdateStorePayload } from '../../domain/repositories/StoreRepository';
import { FirebaseStoreRepository } from '../../infra/repositories/FirebaseStoreRepository';

const storeRepository = new FirebaseStoreRepository();

export interface StoreExportPayload {
  store: {
    id: string;
    name: string;
    site: string;
    stage: string;
    scenarioCount: number;
  };
  exportedAt: string;
  scenarios: StoreScenario[];
}

export class StoreService {
  private readonly listStoresByOrganization = new ListStoresByOrganization(storeRepository);
  private readonly getStoreById = new GetStoreById(storeRepository);
  private readonly createStoreUseCase = new CreateStore(storeRepository);
  private readonly updateStoreUseCase = new UpdateStore(storeRepository);
  private readonly deleteStoreUseCase = new DeleteStore(storeRepository);

  private readonly listScenariosUseCase = new ListStoreScenarios(storeRepository);
  private readonly createScenarioUseCase = new CreateStoreScenario(storeRepository);
  private readonly updateScenarioUseCase = new UpdateStoreScenario(storeRepository);
  private readonly deleteScenarioUseCase = new DeleteStoreScenario(storeRepository);
  private readonly replaceScenariosUseCase = new ReplaceStoreScenarios(storeRepository);
  private readonly mergeScenariosUseCase = new MergeStoreScenarios(storeRepository);

  listByOrganization(organizationId: string): Promise<Store[]> {
    return this.listStoresByOrganization.execute(organizationId);
  }

  getById(storeId: string): Promise<Store | null> {
    return this.getStoreById.execute(storeId);
  }

  create(payload: CreateStorePayload): Promise<Store> {
    return this.createStoreUseCase.execute(payload);
  }

  update(storeId: string, payload: UpdateStorePayload): Promise<Store> {
    return this.updateStoreUseCase.execute(storeId, payload);
  }

  delete(storeId: string): Promise<void> {
    return this.deleteStoreUseCase.execute(storeId);
  }

  listScenarios(storeId: string): Promise<StoreScenario[]> {
    return this.listScenariosUseCase.execute(storeId);
  }

  createScenario(payload: { storeId: string } & StoreScenarioInput): Promise<StoreScenario> {
    return this.createScenarioUseCase.execute(payload);
  }

  updateScenario(
    storeId: string,
    scenarioId: string,
    payload: StoreScenarioInput
  ): Promise<StoreScenario> {
    return this.updateScenarioUseCase.execute(storeId, scenarioId, payload);
  }

  deleteScenario(storeId: string, scenarioId: string): Promise<void> {
    return this.deleteScenarioUseCase.execute(storeId, scenarioId);
  }

  async exportStore(storeId: string): Promise<StoreExportPayload> {
    const store = await this.getById(storeId);

    if (!store) {
      throw new Error('Loja não encontrada.');
    }

    const scenarios = await this.listScenarios(storeId);
    return {
      store: {
        id: store.id,
        name: store.name,
        site: store.site,
        stage: store.stage,
        scenarioCount: scenarios.length
      },
      exportedAt: new Date().toISOString(),
      scenarios
    };
  }

  async importScenarios(
    storeId: string,
    scenarios: StoreScenarioInput[],
    strategy: 'replace' | 'merge'
  ): Promise<{
    scenarios: StoreScenario[];
    created: number;
    skipped: number;
    strategy: 'replace' | 'merge';
  }> {
    if (strategy === 'replace') {
      const replaced = await this.replaceScenariosUseCase.execute(storeId, scenarios);
      return {
        scenarios: replaced,
        created: replaced.length,
        skipped: 0,
        strategy
      };
    }

    const result = await this.mergeScenariosUseCase.execute(storeId, scenarios);
    return {
      scenarios: result.scenarios,
      created: result.created,
      skipped: result.skipped,
      strategy
    };
  }
}

export const storeService = new StoreService();
