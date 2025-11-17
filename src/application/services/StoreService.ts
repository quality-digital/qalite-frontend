import type {
  Store,
  StoreCategory,
  StoreCategoryInput,
  StoreScenario,
  StoreScenarioInput,
  StoreSuite,
  StoreSuiteInput,
} from '../../domain/entities/Store';
import type {
  CreateStorePayload,
  IStoreRepository,
  UpdateStorePayload,
} from '../../domain/repositories/StoreRepository';
import { CreateStore } from '../../domain/usecases/CreateStore';
import { CreateStoreScenario } from '../../domain/usecases/CreateStoreScenario';
import { CreateStoreSuite } from '../../domain/usecases/CreateStoreSuite';
import { DeleteStore } from '../../domain/usecases/DeleteStore';
import { DeleteStoreScenario } from '../../domain/usecases/DeleteStoreScenario';
import { DeleteStoreSuite } from '../../domain/usecases/DeleteStoreSuite';
import { GetStoreById } from '../../domain/usecases/GetStoreById';
import { ListStoreScenarios } from '../../domain/usecases/ListStoreScenarios';
import { ListStoreCategories } from '../../domain/usecases/ListStoreCategories';
import { ListStoreSuites } from '../../domain/usecases/ListStoreSuites';
import { ListStoresByOrganization } from '../../domain/usecases/ListStoresByOrganization';
import { MergeStoreScenarios } from '../../domain/usecases/MergeStoreScenarios';
import { ReplaceStoreScenarios } from '../../domain/usecases/ReplaceStoreScenarios';
import { UpdateStore } from '../../domain/usecases/UpdateStore';
import { UpdateStoreScenario } from '../../domain/usecases/UpdateStoreScenario';
import { UpdateStoreSuite } from '../../domain/usecases/UpdateStoreSuite';
import { CreateStoreCategory } from '../../domain/usecases/CreateStoreCategory';
import { UpdateStoreCategory } from '../../domain/usecases/UpdateStoreCategory';
import { DeleteStoreCategory } from '../../domain/usecases/DeleteStoreCategory';

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

export class StoreService {
  private readonly listStoresByOrganization: ListStoresByOrganization;
  private readonly getStoreById: GetStoreById;
  private readonly createStoreUseCase: CreateStore;
  private readonly updateStoreUseCase: UpdateStore;
  private readonly deleteStoreUseCase: DeleteStore;

  private readonly listScenariosUseCase: ListStoreScenarios;
  private readonly createScenarioUseCase: CreateStoreScenario;
  private readonly updateScenarioUseCase: UpdateStoreScenario;
  private readonly deleteScenarioUseCase: DeleteStoreScenario;
  private readonly replaceScenariosUseCase: ReplaceStoreScenarios;
  private readonly mergeScenariosUseCase: MergeStoreScenarios;
  private readonly listSuitesUseCase: ListStoreSuites;
  private readonly createSuiteUseCase: CreateStoreSuite;
  private readonly updateSuiteUseCase: UpdateStoreSuite;
  private readonly deleteSuiteUseCase: DeleteStoreSuite;
  private readonly listCategoriesUseCase: ListStoreCategories;
  private readonly createCategoryUseCase: CreateStoreCategory;
  private readonly updateCategoryUseCase: UpdateStoreCategory;
  private readonly deleteCategoryUseCase: DeleteStoreCategory;

  constructor(repository: IStoreRepository) {
    this.listStoresByOrganization = new ListStoresByOrganization(repository);
    this.getStoreById = new GetStoreById(repository);
    this.createStoreUseCase = new CreateStore(repository);
    this.updateStoreUseCase = new UpdateStore(repository);
    this.deleteStoreUseCase = new DeleteStore(repository);

    this.listScenariosUseCase = new ListStoreScenarios(repository);
    this.createScenarioUseCase = new CreateStoreScenario(repository);
    this.updateScenarioUseCase = new UpdateStoreScenario(repository);
    this.deleteScenarioUseCase = new DeleteStoreScenario(repository);
    this.replaceScenariosUseCase = new ReplaceStoreScenarios(repository);
    this.mergeScenariosUseCase = new MergeStoreScenarios(repository);
    this.listSuitesUseCase = new ListStoreSuites(repository);
    this.createSuiteUseCase = new CreateStoreSuite(repository);
    this.updateSuiteUseCase = new UpdateStoreSuite(repository);
    this.deleteSuiteUseCase = new DeleteStoreSuite(repository);
    this.listCategoriesUseCase = new ListStoreCategories(repository);
    this.createCategoryUseCase = new CreateStoreCategory(repository);
    this.updateCategoryUseCase = new UpdateStoreCategory(repository);
    this.deleteCategoryUseCase = new DeleteStoreCategory(repository);
  }

  listByOrganization(organizationId: string): Promise<Store[]> {
    return this.listStoresByOrganization.execute(organizationId);
  }

  getById(storeId: string): Promise<Store | null> {
    return this.getStoreById.execute(storeId);
  }

  create(payload: CreateStorePayload): Promise<Store> {
    return this.createStoreUseCase.execute(payload);
  }

  update(storeId: string, payload: UpdateStorePayload): Promise<Store> {
    return this.updateStoreUseCase.execute(storeId, payload);
  }

  delete(storeId: string): Promise<void> {
    return this.deleteStoreUseCase.execute(storeId);
  }

  listScenarios(storeId: string): Promise<StoreScenario[]> {
    return this.listScenariosUseCase.execute(storeId);
  }

  createScenario(payload: { storeId: string } & StoreScenarioInput): Promise<StoreScenario> {
    return this.createScenarioUseCase.execute(payload);
  }

  updateScenario(
    storeId: string,
    scenarioId: string,
    payload: StoreScenarioInput,
  ): Promise<StoreScenario> {
    return this.updateScenarioUseCase.execute(storeId, scenarioId, payload);
  }

  deleteScenario(storeId: string, scenarioId: string): Promise<void> {
    return this.deleteScenarioUseCase.execute(storeId, scenarioId);
  }

  listSuites(storeId: string): Promise<StoreSuite[]> {
    return this.listSuitesUseCase.execute(storeId);
  }

  createSuite(payload: { storeId: string } & StoreSuiteInput): Promise<StoreSuite> {
    return this.createSuiteUseCase.execute(payload);
  }

  updateSuite(storeId: string, suiteId: string, payload: StoreSuiteInput): Promise<StoreSuite> {
    return this.updateSuiteUseCase.execute(storeId, suiteId, payload);
  }

  deleteSuite(storeId: string, suiteId: string): Promise<void> {
    return this.deleteSuiteUseCase.execute(storeId, suiteId);
  }

  listCategories(storeId: string): Promise<StoreCategory[]> {
    return this.listCategoriesUseCase.execute(storeId);
  }

  createCategory(payload: { storeId: string } & StoreCategoryInput): Promise<StoreCategory> {
    return this.createCategoryUseCase.execute(payload);
  }

  updateCategory(
    storeId: string,
    categoryId: string,
    payload: StoreCategoryInput,
  ): Promise<StoreCategory> {
    return this.updateCategoryUseCase.execute(storeId, categoryId, payload);
  }

  deleteCategory(storeId: string, categoryId: string): Promise<void> {
    return this.deleteCategoryUseCase.execute(storeId, categoryId);
  }

  async exportStore(storeId: string): Promise<StoreExportPayload> {
    const store = await this.getById(storeId);

    if (!store) {
      throw new Error('Loja não encontrada.');
    }

    const scenarios = await this.listScenarios(storeId);
    return {
      store: {
        id: store.id,
        name: store.name,
        site: store.site,
        stage: store.stage,
        scenarioCount: scenarios.length,
      },
      exportedAt: new Date().toISOString(),
      scenarios,
    };
  }

  async importScenarios(
    storeId: string,
    scenarios: StoreScenarioInput[],
    strategy: 'replace' | 'merge',
  ): Promise<{
    scenarios: StoreScenario[];
    created: number;
    skipped: number;
    strategy: 'replace' | 'merge';
  }> {
    if (strategy === 'replace') {
      const replaced = await this.replaceScenariosUseCase.execute(storeId, scenarios);
      return {
        scenarios: replaced,
        created: replaced.length,
        skipped: 0,
        strategy,
      };
    }

    const result = await this.mergeScenariosUseCase.execute(storeId, scenarios);
    return {
      scenarios: result.scenarios,
      created: result.created,
      skipped: result.skipped,
      strategy,
    };
  }
}
