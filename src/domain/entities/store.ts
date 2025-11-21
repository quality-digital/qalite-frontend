export interface Store {
  id: string;
  organizationId: string;
  name: string;
  site: string;
  stage: string;
  scenarioCount: number;
  createdAt: Date | null;
  updatedAt: Date | null;
}

export interface StoreScenario {
  id: string;
  storeId: string;
  title: string;
  category: string;
  automation: string;
  criticality: string;
  observation: string;
  bdd: string;
  createdAt: Date | null;
  updatedAt: Date | null;
}

export interface StoreScenarioInput {
  title: string;
  category: string;
  automation: string;
  criticality: string;
  observation: string;
  bdd: string;
}

export interface StoreSuite {
  id: string;
  storeId: string;
  name: string;
  description: string;
  scenarioIds: string[];
  createdAt: Date | null;
  updatedAt: Date | null;
}

export interface StoreSuiteInput {
  name: string;
  description: string;
  scenarioIds: string[];
}

export interface StoreCategory {
  id: string;
  storeId: string;
  name: string;
  createdAt: Date | null;
  updatedAt: Date | null;
}

export interface StoreCategoryInput {
  name: string;
}

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

export interface StoreSuiteExportPayload {
  store: {
    id: string;
    name: string;
    site: string;
    stage: string;
    scenarioCount: number;
  };
  exportedAt: string;
  suites: Array<{
    id: string;
    name: string;
    description: string;
    scenarios: Array<{ id: string; title: string }>;
  }>;
}
