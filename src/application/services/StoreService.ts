import type {
  Store,
  StoreCategory,
  StoreCategoryInput,
  StoreScenario,
  StoreScenarioInput,
  StoreSuite,
  StoreSuiteInput,
} from '../../domain/entities/Store';
import type {
  CreateStorePayload,
  IStoreRepository,
  UpdateStorePayload,
} from '../../domain/repositories/StoreRepository';

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
  constructor(private readonly repository: IStoreRepository) {}

  listByOrganization(organizationId: string): Promise<Store[]> {
    return this.repository.listByOrganization(organizationId);
  }

  getById(storeId: string): Promise<Store | null> {
    return this.repository.getById(storeId);
  }

  create(payload: CreateStorePayload): Promise<Store> {
    return this.repository.createStore(payload);
  }

  update(storeId: string, payload: UpdateStorePayload): Promise<Store> {
    return this.repository.updateStore(storeId, payload);
  }

  delete(storeId: string): Promise<void> {
    return this.repository.deleteStore(storeId);
  }

  listScenarios(storeId: string): Promise<StoreScenario[]> {
    return this.repository.listScenarios(storeId);
  }

  createScenario(payload: { storeId: string } & StoreScenarioInput): Promise<StoreScenario> {
    return this.repository.createScenario(payload);
  }

  updateScenario(
    storeId: string,
    scenarioId: string,
    payload: StoreScenarioInput,
  ): Promise<StoreScenario> {
    return this.repository.updateScenario(storeId, scenarioId, payload);
  }

  deleteScenario(storeId: string, scenarioId: string): Promise<void> {
    return this.repository.deleteScenario(storeId, scenarioId);
  }

  listSuites(storeId: string): Promise<StoreSuite[]> {
    return this.repository.listSuites(storeId);
  }

  createSuite(payload: { storeId: string } & StoreSuiteInput): Promise<StoreSuite> {
    return this.repository.createSuite(payload);
  }

  updateSuite(storeId: string, suiteId: string, payload: StoreSuiteInput): Promise<StoreSuite> {
    return this.repository.updateSuite(storeId, suiteId, payload);
  }

  deleteSuite(storeId: string, suiteId: string): Promise<void> {
    return this.repository.deleteSuite(storeId, suiteId);
  }

  listCategories(storeId: string): Promise<StoreCategory[]> {
    return this.repository.listCategories(storeId);
  }

  createCategory(payload: { storeId: string } & StoreCategoryInput): Promise<StoreCategory> {
    return this.repository.createCategory(payload);
  }

  updateCategory(
    storeId: string,
    categoryId: string,
    payload: StoreCategoryInput,
  ): Promise<StoreCategory> {
    return this.repository.updateCategory(storeId, categoryId, payload);
  }

  deleteCategory(storeId: string, categoryId: string): Promise<void> {
    return this.repository.deleteCategory(storeId, categoryId);
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
        scenarioCount: scenarios.length,
      },
      exportedAt: new Date().toISOString(),
      scenarios,
    };
  }

  async importScenarios(
    storeId: string,
    scenarios: StoreScenarioInput[],
    strategy: 'replace' | 'merge',
  ): Promise<{
    scenarios: StoreScenario[];
    created: number;
    skipped: number;
    strategy: 'replace' | 'merge';
  }> {
    if (strategy === 'replace') {
      const replaced = await this.repository.replaceScenarios(storeId, scenarios);
      return {
        scenarios: replaced,
        created: replaced.length,
        skipped: 0,
        strategy,
      };
    }

    const result = await this.repository.mergeScenarios(storeId, scenarios);
    return {
      ...result,
      strategy,
    };
  }
}
