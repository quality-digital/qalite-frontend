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
