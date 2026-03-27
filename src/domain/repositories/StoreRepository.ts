import type {
  CreateStoreScenarioPayload,
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
} from '../entities/store';

export interface StoreRepository {
  listByOrganization: (organizationId: string) => Promise<Store[]>;
  getById: (id: string) => Promise<Store | null>;
  listSummary: (organizationId: string) => Promise<Store[]>;
  getDetail: (id: string) => Promise<Store | null>;
  create: (store: CreateStorePayload) => Promise<Store>;
  update: (id: string, store: UpdateStorePayload) => Promise<Store>;
  uploadLogo: (storeId: string, file: File) => Promise<string>;
  delete: (id: string) => Promise<void>;
  listScenarios: (storeId: string) => Promise<StoreScenario[]>;
  listenToScenarios: (
    storeId: string,
    onChange: (scenarios: StoreScenario[]) => void,
    onError?: (error: Error) => void,
  ) => () => void;
  createScenario: (scenario: CreateStoreScenarioPayload) => Promise<StoreScenario>;
  updateScenario: (
    storeId: string,
    scenarioId: string,
    scenario: StoreScenarioInput,
  ) => Promise<StoreScenario>;
  deleteScenario: (storeId: string, scenarioId: string) => Promise<void>;
  listSuites: (storeId: string) => Promise<StoreSuite[]>;
  listenToSuites: (
    storeId: string,
    onChange: (suites: StoreSuite[]) => void,
    onError?: (error: Error) => void,
  ) => () => void;
  createSuite: (suite: { storeId: string } & StoreSuiteInput) => Promise<StoreSuite>;
  updateSuite: (storeId: string, suiteId: string, suite: StoreSuiteInput) => Promise<StoreSuite>;
  deleteSuite: (storeId: string, suiteId: string) => Promise<void>;
  listCategories: (storeId: string) => Promise<StoreCategory[]>;
  createCategory: (category: { storeId: string } & StoreCategoryInput) => Promise<StoreCategory>;
  updateCategory: (
    storeId: string,
    categoryId: string,
    category: StoreCategoryInput,
  ) => Promise<StoreCategory>;
  deleteCategory: (storeId: string, categoryId: string) => Promise<void>;
  exportStore: (storeId: string) => Promise<StoreExportPayload>;
}
