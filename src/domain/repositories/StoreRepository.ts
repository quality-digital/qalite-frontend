import type {
  ImportScenariosResult,
  ImportSuitesResult,
  CreateStorePayload,
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
} from '../entities/types';

export interface StoreRepository {
  listByOrganization: (organizationId: string) => Promise<Store[]>;
  getById: (id: string) => Promise<Store | null>;
  create: (store: CreateStorePayload) => Promise<Store>;
  update: (id: string, store: UpdateStorePayload) => Promise<Store>;
  delete: (id: string) => Promise<void>;
  listScenarios: (storeId: string) => Promise<StoreScenario[]>;
  createScenario: (scenario: { storeId: string } & StoreScenarioInput) => Promise<StoreScenario>;
  updateScenario: (
    storeId: string,
    scenarioId: string,
    scenario: StoreScenarioInput,
  ) => Promise<StoreScenario>;
  deleteScenario: (storeId: string, scenarioId: string) => Promise<void>;
  listSuites: (storeId: string) => Promise<StoreSuite[]>;
  createSuite: (suite: { storeId: string } & StoreSuiteInput) => Promise<StoreSuite>;
  updateSuite: (storeId: string, suiteId: string, suite: StoreSuiteInput) => Promise<StoreSuite>;
  deleteSuite: (storeId: string, suiteId: string) => Promise<void>;
  listCategories: (storeId: string) => Promise<StoreCategory[]>;
  createCategory: (category: { storeId: string } & StoreCategoryInput) => Promise<StoreCategory>;
  updateCategory: (storeId: string, categoryId: string, category: StoreCategoryInput) => Promise<StoreCategory>;
  deleteCategory: (storeId: string, categoryId: string) => Promise<void>;
  exportStore: (storeId: string) => Promise<StoreExportPayload>;
  exportSuites: (storeId: string) => Promise<StoreSuiteExportPayload>;
  importScenarios: (
    storeId: string,
    scenarios: StoreScenarioInput[],
    strategy: 'replace' | 'merge',
  ) => Promise<{
    scenarios: StoreScenario[];
    created: number;
    skipped: number;
    strategy: 'replace' | 'merge';
  }>;
  importSuites: (
    storeId: string,
    suites: StoreSuiteInput[],
    strategy: 'replace' | 'merge',
  ) => Promise<{
    suites: StoreSuite[];
    created: number;
    skipped: number;
    strategy: 'replace' | 'merge';
  }>;
  replaceScenarios: (storeId: string, scenarios: StoreScenarioInput[]) => Promise<StoreScenario[]>;
  replaceSuites: (storeId: string, suites: StoreSuiteInput[]) => Promise<StoreSuite[]>;
  mergeScenarios: (storeId: string, scenarios: StoreScenarioInput[]) => Promise<ImportScenariosResult>;
  mergeSuites: (storeId: string, suites: StoreSuiteInput[]) => Promise<ImportSuitesResult>;
}
