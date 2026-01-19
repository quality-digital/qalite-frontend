import type { StoreRepository } from '../../domain/repositories/StoreRepository';
import type {
  CreateStorePayload,
  Store,
  StoreCategory,
  StoreCategoryInput,
  StoreExportPayload,
  StoreScenario,
  StoreScenarioInput,
  StoreSuite,
  StoreSuiteInput,
  UpdateStorePayload,
} from '../../domain/entities/store';
import { firebaseStoreRepository } from '../../infrastructure/repositories/firebaseStoreRepository';

export class StoreUseCases {
  constructor(private readonly storeRepository: StoreRepository) {}

  listByOrganization(organizationId: string): Promise<Store[]> {
    return this.storeRepository.listByOrganization(organizationId);
  }

  getById(id: string): Promise<Store | null> {
    return this.storeRepository.getById(id);
  }

  create(store: CreateStorePayload): Promise<Store> {
    return this.storeRepository.create(store);
  }

  update(id: string, store: UpdateStorePayload): Promise<Store> {
    return this.storeRepository.update(id, store);
  }

  delete(id: string): Promise<void> {
    return this.storeRepository.delete(id);
  }

  listScenarios(storeId: string): Promise<StoreScenario[]> {
    return this.storeRepository.listScenarios(storeId);
  }

  createScenario(scenario: { storeId: string } & StoreScenarioInput): Promise<StoreScenario> {
    return this.storeRepository.createScenario(scenario);
  }

  updateScenario(
    storeId: string,
    scenarioId: string,
    scenario: StoreScenarioInput,
  ): Promise<StoreScenario> {
    return this.storeRepository.updateScenario(storeId, scenarioId, scenario);
  }

  deleteScenario(storeId: string, scenarioId: string): Promise<void> {
    return this.storeRepository.deleteScenario(storeId, scenarioId);
  }

  listSuites(storeId: string): Promise<StoreSuite[]> {
    return this.storeRepository.listSuites(storeId);
  }

  createSuite(suite: { storeId: string } & StoreSuiteInput): Promise<StoreSuite> {
    return this.storeRepository.createSuite(suite);
  }

  updateSuite(storeId: string, suiteId: string, suite: StoreSuiteInput): Promise<StoreSuite> {
    return this.storeRepository.updateSuite(storeId, suiteId, suite);
  }

  deleteSuite(storeId: string, suiteId: string): Promise<void> {
    return this.storeRepository.deleteSuite(storeId, suiteId);
  }

  listCategories(storeId: string): Promise<StoreCategory[]> {
    return this.storeRepository.listCategories(storeId);
  }

  createCategory(category: { storeId: string } & StoreCategoryInput): Promise<StoreCategory> {
    return this.storeRepository.createCategory(category);
  }

  updateCategory(
    storeId: string,
    categoryId: string,
    category: StoreCategoryInput,
  ): Promise<StoreCategory> {
    return this.storeRepository.updateCategory(storeId, categoryId, category);
  }

  deleteCategory(storeId: string, categoryId: string): Promise<void> {
    return this.storeRepository.deleteCategory(storeId, categoryId);
  }

  exportStore(storeId: string): Promise<StoreExportPayload> {
    return this.storeRepository.exportStore(storeId);
  }
}

export const storeService = new StoreUseCases(firebaseStoreRepository);
