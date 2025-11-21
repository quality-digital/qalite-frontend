import type { StoreRepository } from '../../domain/repositories/StoreRepository';
import type {
  CreateStoreDTO,
  ImportStoreScenariosResultDTO,
  ImportStoreSuitesResultDTO,
  StoreCategoryDTO,
  StoreCategoryInputDTO,
  StoreDTO,
  StoreExportDTO,
  StoreScenarioDTO,
  StoreScenarioInputDTO,
  StoreSuiteDTO,
  StoreSuiteExportDTO,
  StoreSuiteInputDTO,
  UpdateStoreDTO,
} from '../dto/StoreDto';
import { firebaseStoreRepository } from '../../infrastructure/repositories/firebaseStoreRepository';

export class StoreUseCases {
  constructor(private readonly storeRepository: StoreRepository) {}

  listByOrganization(organizationId: string): Promise<StoreDTO[]> {
    return this.storeRepository.listByOrganization(organizationId);
  }

  getById(id: string): Promise<StoreDTO | null> {
    return this.storeRepository.getById(id);
  }

  create(store: CreateStoreDTO): Promise<StoreDTO> {
    return this.storeRepository.create(store);
  }

  update(id: string, store: UpdateStoreDTO): Promise<StoreDTO> {
    return this.storeRepository.update(id, store);
  }

  delete(id: string): Promise<void> {
    return this.storeRepository.delete(id);
  }

  listScenarios(storeId: string): Promise<StoreScenarioDTO[]> {
    return this.storeRepository.listScenarios(storeId);
  }

  createScenario(scenario: { storeId: string } & StoreScenarioInputDTO): Promise<StoreScenarioDTO> {
    return this.storeRepository.createScenario(scenario);
  }

  updateScenario(
    storeId: string,
    scenarioId: string,
    scenario: StoreScenarioInputDTO,
  ): Promise<StoreScenarioDTO> {
    return this.storeRepository.updateScenario(storeId, scenarioId, scenario);
  }

  deleteScenario(storeId: string, scenarioId: string): Promise<void> {
    return this.storeRepository.deleteScenario(storeId, scenarioId);
  }

  listSuites(storeId: string): Promise<StoreSuiteDTO[]> {
    return this.storeRepository.listSuites(storeId);
  }

  createSuite(suite: { storeId: string } & StoreSuiteInputDTO): Promise<StoreSuiteDTO> {
    return this.storeRepository.createSuite(suite);
  }

  updateSuite(storeId: string, suiteId: string, suite: StoreSuiteInputDTO): Promise<StoreSuiteDTO> {
    return this.storeRepository.updateSuite(storeId, suiteId, suite);
  }

  deleteSuite(storeId: string, suiteId: string): Promise<void> {
    return this.storeRepository.deleteSuite(storeId, suiteId);
  }

  listCategories(storeId: string): Promise<StoreCategoryDTO[]> {
    return this.storeRepository.listCategories(storeId);
  }

  createCategory(category: { storeId: string } & StoreCategoryInputDTO): Promise<StoreCategoryDTO> {
    return this.storeRepository.createCategory(category);
  }

  updateCategory(
    storeId: string,
    categoryId: string,
    category: StoreCategoryInputDTO,
  ): Promise<StoreCategoryDTO> {
    return this.storeRepository.updateCategory(storeId, categoryId, category);
  }

  deleteCategory(storeId: string, categoryId: string): Promise<void> {
    return this.storeRepository.deleteCategory(storeId, categoryId);
  }

  exportStore(storeId: string): Promise<StoreExportDTO> {
    return this.storeRepository.exportStore(storeId);
  }

  exportSuites(storeId: string): Promise<StoreSuiteExportDTO> {
    return this.storeRepository.exportSuites(storeId);
  }

  importScenarios(
    storeId: string,
    scenarios: StoreScenarioInputDTO[],
    strategy: 'replace' | 'merge',
  ): Promise<{
    scenarios: StoreScenarioDTO[];
    created: number;
    skipped: number;
    strategy: 'replace' | 'merge';
  }> {
    return this.storeRepository.importScenarios(storeId, scenarios, strategy);
  }

  importSuites(
    storeId: string,
    suites: StoreSuiteInputDTO[],
    strategy: 'replace' | 'merge',
  ): Promise<{
    suites: StoreSuiteDTO[];
    created: number;
    skipped: number;
    strategy: 'replace' | 'merge';
  }> {
    return this.storeRepository.importSuites(storeId, suites, strategy);
  }

  replaceScenarios(
    storeId: string,
    scenarios: StoreScenarioInputDTO[],
  ): Promise<StoreScenarioDTO[]> {
    return this.storeRepository.replaceScenarios(storeId, scenarios);
  }

  replaceSuites(storeId: string, suites: StoreSuiteInputDTO[]): Promise<StoreSuiteDTO[]> {
    return this.storeRepository.replaceSuites(storeId, suites);
  }

  mergeScenarios(
    storeId: string,
    scenarios: StoreScenarioInputDTO[],
  ): Promise<ImportStoreScenariosResultDTO> {
    return this.storeRepository.mergeScenarios(storeId, scenarios);
  }

  mergeSuites(storeId: string, suites: StoreSuiteInputDTO[]): Promise<ImportStoreSuitesResultDTO> {
    return this.storeRepository.mergeSuites(storeId, suites);
  }
}

export const storeUseCases = new StoreUseCases(firebaseStoreRepository);
export const storeService = storeUseCases;
