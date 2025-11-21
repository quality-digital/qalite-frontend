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

export type StoreDTO = Store;
export type StoreScenarioDTO = StoreScenario;
export type StoreSuiteDTO = StoreSuite;
export type StoreCategoryDTO = StoreCategory;
export type StoreExportDTO = StoreExportPayload;
export type StoreSuiteExportDTO = StoreSuiteExportPayload;
export type ImportStoreScenariosResultDTO = ImportScenariosResult;
export type ImportStoreSuitesResultDTO = ImportSuitesResult;

export type CreateStoreDTO = CreateStorePayload;
export type UpdateStoreDTO = UpdateStorePayload;
export type StoreScenarioInputDTO = StoreScenarioInput;
export type StoreSuiteInputDTO = StoreSuiteInput;
export type StoreCategoryInputDTO = StoreCategoryInput;
