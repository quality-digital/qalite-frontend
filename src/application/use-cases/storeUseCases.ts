import type { StoreRepository } from '../../domain/repositories/StoreRepository';
import type {
  CreateStorePayload,
  ImportScenariosResult,
  ImportSuitesResult,
  Store,
  StoreCategory,
  StoreCategoryInput,
  StoreExportPayload,
  StoreScenario,
  StoreScenarioInput,
  StoreSuite,
  StoreSuiteExportPayload,
  StoreSuiteInput,
  UpdateStorePayload,
} from '../../domain/entities/store';

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

  exportSuites(storeId: string): Promise<StoreSuiteExportPayload> {
    return this.storeRepository.exportSuites(storeId);
  }

  importScenarios(
    storeId: string,
    scenarios: StoreScenarioInput[],
    strategy: 'replace' | 'merge',
  ): Promise<{
    scenarios: StoreScenario[];
    created: number;
    skipped: number;
    strategy: 'replace' | 'merge';
  }> {
    return this.storeRepository.importScenarios(storeId, scenarios, strategy);
  }

  importSuites(
    storeId: string,
    suites: StoreSuiteInput[],
    strategy: 'replace' | 'merge',
  ): Promise<{
    suites: StoreSuite[];
    created: number;
    skipped: number;
    strategy: 'replace' | 'merge';
  }> {
    return this.storeRepository.importSuites(storeId, suites, strategy);
  }

  replaceScenarios(storeId: string, scenarios: StoreScenarioInput[]): Promise<StoreScenario[]> {
    return this.storeRepository.replaceScenarios(storeId, scenarios);
  }

  replaceSuites(storeId: string, suites: StoreSuiteInput[]): Promise<StoreSuite[]> {
    return this.storeRepository.replaceSuites(storeId, suites);
  }

  mergeScenarios(storeId: string, scenarios: StoreScenarioInput[]): Promise<ImportScenariosResult> {
    return this.storeRepository.mergeScenarios(storeId, scenarios);
  }

  mergeSuites(storeId: string, suites: StoreSuiteInput[]): Promise<ImportSuitesResult> {
    return this.storeRepository.mergeSuites(storeId, suites);
  }
}
