import type { Store, StoreScenario, StoreScenarioInput } from '../entities/Store';

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

export interface UpdateStoreScenarioPayload extends StoreScenarioInput {}

export interface ImportScenariosResult {
  created: number;
  skipped: number;
  scenarios: StoreScenario[];
}

export interface IStoreRepository {
  listByOrganization(organizationId: string): Promise<Store[]>;
  getById(storeId: string): Promise<Store | null>;
  createStore(payload: CreateStorePayload): Promise<Store>;
  updateStore(storeId: string, payload: UpdateStorePayload): Promise<Store>;
  deleteStore(storeId: string): Promise<void>;

  listScenarios(storeId: string): Promise<StoreScenario[]>;
  createScenario(payload: CreateStoreScenarioPayload): Promise<StoreScenario>;
  updateScenario(storeId: string, scenarioId: string, payload: UpdateStoreScenarioPayload): Promise<StoreScenario>;
  deleteScenario(storeId: string, scenarioId: string): Promise<void>;

  replaceScenarios(storeId: string, scenarios: StoreScenarioInput[]): Promise<StoreScenario[]>;
  mergeScenarios(storeId: string, scenarios: StoreScenarioInput[]): Promise<ImportScenariosResult>;
}
