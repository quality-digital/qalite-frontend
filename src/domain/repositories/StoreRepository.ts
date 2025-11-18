import type {
  Store,
  StoreCategory,
  StoreCategoryInput,
  StoreScenario,
  StoreScenarioInput,
  StoreSuite,
  StoreSuiteInput,
} from '../entities/Store';

export interface CreateStorePayload {
  organizationId: string;
  name: string;
  site: string;
  stage: string;
}

export interface UpdateStorePayload {
  name: string;
  site: string;
  stage: string;
}

export interface CreateStoreScenarioPayload extends StoreScenarioInput {
  storeId: string;
}

export type UpdateStoreScenarioPayload = StoreScenarioInput;

export interface CreateStoreSuitePayload extends StoreSuiteInput {
  storeId: string;
}

export type UpdateStoreSuitePayload = StoreSuiteInput;

export interface CreateStoreCategoryPayload extends StoreCategoryInput {
  storeId: string;
}

export type UpdateStoreCategoryPayload = StoreCategoryInput;

export interface ImportScenariosResult {
  created: number;
  skipped: number;
  scenarios: StoreScenario[];
}

export interface ImportSuitesResult {
  created: number;
  skipped: number;
  suites: StoreSuite[];
}

export interface IStoreRepository {
  listByOrganization(organizationId: string): Promise<Store[]>;
  getById(storeId: string): Promise<Store | null>;
  createStore(payload: CreateStorePayload): Promise<Store>;
  updateStore(storeId: string, payload: UpdateStorePayload): Promise<Store>;
  deleteStore(storeId: string): Promise<void>;

  listScenarios(storeId: string): Promise<StoreScenario[]>;
  createScenario(payload: CreateStoreScenarioPayload): Promise<StoreScenario>;
  updateScenario(
    storeId: string,
    scenarioId: string,
    payload: UpdateStoreScenarioPayload,
  ): Promise<StoreScenario>;
  deleteScenario(storeId: string, scenarioId: string): Promise<void>;

  replaceScenarios(storeId: string, scenarios: StoreScenarioInput[]): Promise<StoreScenario[]>;
  mergeScenarios(storeId: string, scenarios: StoreScenarioInput[]): Promise<ImportScenariosResult>;

  listSuites(storeId: string): Promise<StoreSuite[]>;
  createSuite(payload: CreateStoreSuitePayload): Promise<StoreSuite>;
  updateSuite(
    storeId: string,
    suiteId: string,
    payload: UpdateStoreSuitePayload,
  ): Promise<StoreSuite>;
  deleteSuite(storeId: string, suiteId: string): Promise<void>;
  replaceSuites(storeId: string, suites: StoreSuiteInput[]): Promise<StoreSuite[]>;
  mergeSuites(storeId: string, suites: StoreSuiteInput[]): Promise<ImportSuitesResult>;

  listCategories(storeId: string): Promise<StoreCategory[]>;
  createCategory(payload: CreateStoreCategoryPayload): Promise<StoreCategory>;
  updateCategory(
    storeId: string,
    categoryId: string,
    payload: UpdateStoreCategoryPayload,
  ): Promise<StoreCategory>;
  deleteCategory(storeId: string, categoryId: string): Promise<void>;
}
