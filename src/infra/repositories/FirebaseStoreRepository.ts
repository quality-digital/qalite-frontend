import {
  Timestamp,
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';

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
  CreateStoreCategoryPayload,
  CreateStoreScenarioPayload,
  CreateStoreSuitePayload,
  IStoreRepository,
  ImportScenariosResult,
  ImportSuitesResult,
  UpdateStorePayload,
  UpdateStoreScenarioPayload,
  UpdateStoreSuitePayload,
  UpdateStoreCategoryPayload,
} from '../../domain/repositories/StoreRepository';
import { firebaseFirestore } from '../firebase/firebaseConfig';

const STORES_COLLECTION = 'stores';
const SCENARIOS_SUBCOLLECTION = 'scenarios';
const SUITES_SUBCOLLECTION = 'suites';
const CATEGORIES_SUBCOLLECTION = 'categories';

export class FirebaseStoreRepository implements IStoreRepository {
  private readonly storesCollection = collection(firebaseFirestore, STORES_COLLECTION);

  async listByOrganization(organizationId: string): Promise<Store[]> {
    const storesQuery = query(this.storesCollection, where('organizationId', '==', organizationId));
    const snapshot = await getDocs(storesQuery);
    const stores = snapshot.docs.map((docSnapshot) =>
      this.mapStore(docSnapshot.id, docSnapshot.data()),
    );

    return stores.sort((a, b) => a.name.localeCompare(b.name));
  }

  async getById(storeId: string): Promise<Store | null> {
    const storeRef = doc(firebaseFirestore, STORES_COLLECTION, storeId);
    const snapshot = await getDoc(storeRef);

    if (!snapshot.exists()) {
      return null;
    }

    return this.mapStore(snapshot.id, snapshot.data());
  }

  async createStore(payload: CreateStorePayload): Promise<Store> {
    const trimmedName = payload.name.trim();
    const trimmedSite = payload.site.trim();
    const trimmedStage = payload.stage.trim();

    const docRef = await addDoc(this.storesCollection, {
      organizationId: payload.organizationId,
      name: trimmedName,
      site: trimmedSite,
      stage: trimmedStage,
      scenarioCount: 0,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    const snapshot = await getDoc(docRef);
    return this.mapStore(snapshot.id, snapshot.data() ?? {});
  }

  async updateStore(storeId: string, payload: UpdateStorePayload): Promise<Store> {
    const storeRef = doc(firebaseFirestore, STORES_COLLECTION, storeId);

    await updateDoc(storeRef, {
      name: payload.name.trim(),
      site: payload.site.trim(),
      stage: payload.stage.trim(),
      updatedAt: serverTimestamp(),
    });

    const snapshot = await getDoc(storeRef);
    return this.mapStore(snapshot.id, snapshot.data() ?? {});
  }

  async deleteStore(storeId: string): Promise<void> {
    const storeRef = doc(firebaseFirestore, STORES_COLLECTION, storeId);
    const snapshot = await getDoc(storeRef);

    if (!snapshot.exists()) {
      throw new Error('Loja não encontrada.');
    }

    const scenariosCollection = collection(storeRef, SCENARIOS_SUBCOLLECTION);
    const scenariosSnapshot = await getDocs(scenariosCollection);
    const categoriesCollection = collection(storeRef, CATEGORIES_SUBCOLLECTION);
    const categoriesSnapshot = await getDocs(categoriesCollection);

    const batch = writeBatch(firebaseFirestore);
    scenariosSnapshot.forEach((scenarioDoc) => {
      batch.delete(scenarioDoc.ref);
    });
    categoriesSnapshot.forEach((categoryDoc) => {
      batch.delete(categoryDoc.ref);
    });

    batch.delete(storeRef);
    await batch.commit();
  }

  async listScenarios(storeId: string): Promise<StoreScenario[]> {
    const storeRef = doc(firebaseFirestore, STORES_COLLECTION, storeId);
    const scenariosCollection = collection(storeRef, SCENARIOS_SUBCOLLECTION);
    const scenariosQuery = query(scenariosCollection, orderBy('title'));
    const snapshot = await getDocs(scenariosQuery);

    return snapshot.docs.map((docSnapshot) =>
      this.mapScenario(storeId, docSnapshot.id, docSnapshot.data()),
    );
  }

  async createScenario(payload: CreateStoreScenarioPayload): Promise<StoreScenario> {
    const storeRef = doc(firebaseFirestore, STORES_COLLECTION, payload.storeId);
    const scenariosCollection = collection(storeRef, SCENARIOS_SUBCOLLECTION);

    const scenarioRef = await runTransaction(firebaseFirestore, async (transaction) => {
      const storeSnapshot = await transaction.get(storeRef);

      if (!storeSnapshot.exists()) {
        throw new Error('Loja não encontrada.');
      }

      const newScenarioRef = doc(scenariosCollection);
      transaction.set(newScenarioRef, {
        ...this.normalizeScenarioInput(payload),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      const currentCount = Number(storeSnapshot.data()?.scenarioCount ?? 0);
      transaction.update(storeRef, {
        scenarioCount: currentCount + 1,
        updatedAt: serverTimestamp(),
      });

      return newScenarioRef;
    });

    const scenarioSnapshot = await getDoc(scenarioRef);
    return this.mapScenario(payload.storeId, scenarioSnapshot.id, scenarioSnapshot.data() ?? {});
  }

  async updateScenario(
    storeId: string,
    scenarioId: string,
    payload: UpdateStoreScenarioPayload,
  ): Promise<StoreScenario> {
    const storeRef = doc(firebaseFirestore, STORES_COLLECTION, storeId);
    const scenarioRef = doc(storeRef, SCENARIOS_SUBCOLLECTION, scenarioId);

    await updateDoc(scenarioRef, {
      ...this.normalizeScenarioInput(payload),
      updatedAt: serverTimestamp(),
    });

    await updateDoc(storeRef, { updatedAt: serverTimestamp() });

    const scenarioSnapshot = await getDoc(scenarioRef);
    return this.mapScenario(storeId, scenarioSnapshot.id, scenarioSnapshot.data() ?? {});
  }

  async deleteScenario(storeId: string, scenarioId: string): Promise<void> {
    const storeRef = doc(firebaseFirestore, STORES_COLLECTION, storeId);
    const scenarioRef = doc(storeRef, SCENARIOS_SUBCOLLECTION, scenarioId);

    await runTransaction(firebaseFirestore, async (transaction) => {
      const storeSnapshot = await transaction.get(storeRef);
      if (!storeSnapshot.exists()) {
        throw new Error('Loja não encontrada.');
      }

      transaction.delete(scenarioRef);

      const currentCount = Number(storeSnapshot.data()?.scenarioCount ?? 0);
      transaction.update(storeRef, {
        scenarioCount: Math.max(currentCount - 1, 0),
        updatedAt: serverTimestamp(),
      });
    });
  }

  async replaceScenarios(
    storeId: string,
    scenarios: StoreScenarioInput[],
  ): Promise<StoreScenario[]> {
    const storeRef = doc(firebaseFirestore, STORES_COLLECTION, storeId);
    const storeSnapshot = await getDoc(storeRef);

    if (!storeSnapshot.exists()) {
      throw new Error('Loja não encontrada.');
    }

    const scenariosCollection = collection(storeRef, SCENARIOS_SUBCOLLECTION);
    const existingScenarios = await getDocs(scenariosCollection);

    const batch = writeBatch(firebaseFirestore);

    existingScenarios.forEach((docSnapshot) => {
      batch.delete(docSnapshot.ref);
    });

    scenarios.forEach((scenario) => {
      const scenarioRef = doc(scenariosCollection);
      batch.set(scenarioRef, {
        ...this.normalizeScenarioInput(scenario),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    });

    batch.update(storeRef, {
      scenarioCount: scenarios.length,
      updatedAt: serverTimestamp(),
    });

    await batch.commit();

    return this.listScenarios(storeId);
  }

  async mergeScenarios(
    storeId: string,
    scenarios: StoreScenarioInput[],
  ): Promise<ImportScenariosResult> {
    const storeRef = doc(firebaseFirestore, STORES_COLLECTION, storeId);
    const storeSnapshot = await getDoc(storeRef);

    if (!storeSnapshot.exists()) {
      throw new Error('Loja não encontrada.');
    }

    const existingScenarios = await this.listScenarios(storeId);
    const existingTitles = new Set(
      existingScenarios.map((scenario) => scenario.title.toLowerCase()),
    );

    const normalizedScenarios = scenarios.map((scenario) => this.normalizeScenarioInput(scenario));
    const scenariosToCreate = normalizedScenarios.filter(
      (scenario) => !existingTitles.has(scenario.title.toLowerCase()),
    );

    if (scenariosToCreate.length === 0) {
      return {
        created: 0,
        skipped: normalizedScenarios.length,
        scenarios: existingScenarios,
      };
    }

    const scenariosCollection = collection(storeRef, SCENARIOS_SUBCOLLECTION);
    const batch = writeBatch(firebaseFirestore);

    scenariosToCreate.forEach((scenario) => {
      const scenarioRef = doc(scenariosCollection);
      batch.set(scenarioRef, {
        ...scenario,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    });

    batch.update(storeRef, {
      scenarioCount: existingScenarios.length + scenariosToCreate.length,
      updatedAt: serverTimestamp(),
    });

    await batch.commit();

    const updatedScenarios = await this.listScenarios(storeId);
    return {
      created: scenariosToCreate.length,
      skipped: normalizedScenarios.length - scenariosToCreate.length,
      scenarios: updatedScenarios,
    };
  }

  async listSuites(storeId: string): Promise<StoreSuite[]> {
    const storeRef = doc(firebaseFirestore, STORES_COLLECTION, storeId);
    const suitesCollection = collection(storeRef, SUITES_SUBCOLLECTION);
    const suitesQuery = query(suitesCollection, orderBy('name'));
    const snapshot = await getDocs(suitesQuery);

    return snapshot.docs.map((docSnapshot) =>
      this.mapSuite(storeId, docSnapshot.id, docSnapshot.data()),
    );
  }

  async createSuite(payload: CreateStoreSuitePayload): Promise<StoreSuite> {
    const storeRef = doc(firebaseFirestore, STORES_COLLECTION, payload.storeId);
    const storeSnapshot = await getDoc(storeRef);

    if (!storeSnapshot.exists()) {
      throw new Error('Loja não encontrada.');
    }

    const suitesCollection = collection(storeRef, SUITES_SUBCOLLECTION);
    const normalized = this.normalizeSuiteInput(payload);
    const suiteRef = await addDoc(suitesCollection, {
      ...normalized,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    const snapshot = await getDoc(suiteRef);
    return this.mapSuite(payload.storeId, snapshot.id, snapshot.data() ?? {});
  }

  async updateSuite(
    storeId: string,
    suiteId: string,
    payload: UpdateStoreSuitePayload,
  ): Promise<StoreSuite> {
    const storeRef = doc(firebaseFirestore, STORES_COLLECTION, storeId);
    const suiteRef = doc(storeRef, SUITES_SUBCOLLECTION, suiteId);
    const suiteSnapshot = await getDoc(suiteRef);

    if (!suiteSnapshot.exists()) {
      throw new Error('Suite de testes não encontrada.');
    }

    await updateDoc(suiteRef, {
      ...this.normalizeSuiteInput(payload),
      updatedAt: serverTimestamp(),
    });

    const updatedSnapshot = await getDoc(suiteRef);
    return this.mapSuite(storeId, updatedSnapshot.id, updatedSnapshot.data() ?? {});
  }

  async deleteSuite(storeId: string, suiteId: string): Promise<void> {
    const storeRef = doc(firebaseFirestore, STORES_COLLECTION, storeId);
    const suiteRef = doc(storeRef, SUITES_SUBCOLLECTION, suiteId);
    const snapshot = await getDoc(suiteRef);

    if (!snapshot.exists()) {
      throw new Error('Suite de testes não encontrada.');
    }

    await deleteDoc(suiteRef);
  }

  async replaceSuites(storeId: string, suites: StoreSuiteInput[]): Promise<StoreSuite[]> {
    const storeRef = doc(firebaseFirestore, STORES_COLLECTION, storeId);
    const storeSnapshot = await getDoc(storeRef);

    if (!storeSnapshot.exists()) {
      throw new Error('Loja não encontrada.');
    }

    const suitesCollection = collection(storeRef, SUITES_SUBCOLLECTION);
    const existingSuites = await getDocs(suitesCollection);
    const batch = writeBatch(firebaseFirestore);

    existingSuites.forEach((docSnapshot) => {
      batch.delete(docSnapshot.ref);
    });

    suites.forEach((suite) => {
      const suiteRef = doc(suitesCollection);
      batch.set(suiteRef, {
        ...this.normalizeSuiteInput(suite),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    });

    await batch.commit();
    return this.listSuites(storeId);
  }

  async mergeSuites(storeId: string, suites: StoreSuiteInput[]): Promise<ImportSuitesResult> {
    const storeRef = doc(firebaseFirestore, STORES_COLLECTION, storeId);
    const storeSnapshot = await getDoc(storeRef);

    if (!storeSnapshot.exists()) {
      throw new Error('Loja não encontrada.');
    }

    const existingSuites = await this.listSuites(storeId);
    const existingNames = new Set(existingSuites.map((suite) => suite.name.trim().toLowerCase()));
    const normalizedSuites = suites.map((suite) => this.normalizeSuiteInput(suite));
    const suitesToCreate = normalizedSuites.filter(
      (suite) => !existingNames.has(suite.name.trim().toLowerCase()),
    );

    if (suitesToCreate.length === 0) {
      return {
        created: 0,
        skipped: normalizedSuites.length,
        suites: existingSuites,
      };
    }

    const suitesCollection = collection(storeRef, SUITES_SUBCOLLECTION);
    const batch = writeBatch(firebaseFirestore);

    suitesToCreate.forEach((suite) => {
      const suiteRef = doc(suitesCollection);
      batch.set(suiteRef, {
        ...suite,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    });

    await batch.commit();
    const updatedSuites = await this.listSuites(storeId);
    return {
      created: suitesToCreate.length,
      skipped: normalizedSuites.length - suitesToCreate.length,
      suites: updatedSuites,
    };
  }

  async listCategories(storeId: string): Promise<StoreCategory[]> {
    const storeRef = doc(firebaseFirestore, STORES_COLLECTION, storeId);
    const categoriesCollection = collection(storeRef, CATEGORIES_SUBCOLLECTION);
    const categoriesQuery = query(categoriesCollection, orderBy('searchName'));
    const snapshot = await getDocs(categoriesQuery);

    return snapshot.docs.map((docSnapshot) =>
      this.mapCategory(storeId, docSnapshot.id, docSnapshot.data()),
    );
  }

  async createCategory(payload: CreateStoreCategoryPayload): Promise<StoreCategory> {
    const storeRef = doc(firebaseFirestore, STORES_COLLECTION, payload.storeId);
    const storeSnapshot = await getDoc(storeRef);

    if (!storeSnapshot.exists()) {
      throw new Error('Loja não encontrada.');
    }

    const { name } = this.normalizeCategoryInput(payload);
    if (!name) {
      throw new Error('Informe o nome da categoria.');
    }
    const searchName = name.toLowerCase();
    const categoriesCollection = collection(storeRef, CATEGORIES_SUBCOLLECTION);

    const existingQuery = query(categoriesCollection, where('searchName', '==', searchName));
    const existingSnapshot = await getDocs(existingQuery);

    if (!existingSnapshot.empty) {
      throw new Error('Já existe uma categoria com este nome.');
    }

    const categoryRef = await addDoc(categoriesCollection, {
      name,
      searchName,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    const categorySnapshot = await getDoc(categoryRef);
    return this.mapCategory(payload.storeId, categorySnapshot.id, categorySnapshot.data() ?? {});
  }

  async updateCategory(
    storeId: string,
    categoryId: string,
    payload: UpdateStoreCategoryPayload,
  ): Promise<StoreCategory> {
    const storeRef = doc(firebaseFirestore, STORES_COLLECTION, storeId);
    const categoryRef = doc(storeRef, CATEGORIES_SUBCOLLECTION, categoryId);
    const categorySnapshot = await getDoc(categoryRef);

    if (!categorySnapshot.exists()) {
      throw new Error('Categoria não encontrada.');
    }

    const previousName = ((categorySnapshot.data()?.name as string) ?? '').trim();
    const { name } = this.normalizeCategoryInput(payload);
    if (!name) {
      throw new Error('Informe o nome da categoria.');
    }
    const searchName = name.toLowerCase();

    const categoriesCollection = collection(storeRef, CATEGORIES_SUBCOLLECTION);
    const existingQuery = query(categoriesCollection, where('searchName', '==', searchName));
    const existingSnapshot = await getDocs(existingQuery);
    const duplicated = existingSnapshot.docs.some((docSnapshot) => docSnapshot.id !== categoryId);

    if (duplicated) {
      throw new Error('Já existe uma categoria com este nome.');
    }

    await updateDoc(categoryRef, {
      name,
      searchName,
      updatedAt: serverTimestamp(),
    });

    if (previousName && previousName !== name) {
      await this.updateScenarioCategories(storeId, previousName, name);
    }

    const updatedSnapshot = await getDoc(categoryRef);
    return this.mapCategory(storeId, updatedSnapshot.id, updatedSnapshot.data() ?? {});
  }

  async deleteCategory(storeId: string, categoryId: string): Promise<void> {
    const storeRef = doc(firebaseFirestore, STORES_COLLECTION, storeId);
    const categoryRef = doc(storeRef, CATEGORIES_SUBCOLLECTION, categoryId);
    const categorySnapshot = await getDoc(categoryRef);

    if (!categorySnapshot.exists()) {
      throw new Error('Categoria não encontrada.');
    }

    const categoryName = ((categorySnapshot.data()?.name as string) ?? '').trim();

    if (categoryName) {
      const scenariosCollection = collection(storeRef, SCENARIOS_SUBCOLLECTION);
      const scenariosQuery = query(scenariosCollection, where('category', '==', categoryName));
      const scenariosSnapshot = await getDocs(scenariosQuery);

      if (!scenariosSnapshot.empty) {
        throw new Error(
          'Não é possível remover uma categoria associada a cenários. Atualize ou remova os cenários primeiro.',
        );
      }
    }

    await deleteDoc(categoryRef);
  }

  private normalizeScenarioInput(input: StoreScenarioInput): StoreScenarioInput {
    return {
      title: input.title.trim(),
      category: input.category.trim(),
      automation: input.automation.trim(),
      criticality: input.criticality.trim(),
      observation: input.observation.trim(),
      bdd: input.bdd.trim(),
    };
  }

  private normalizeSuiteInput(input: StoreSuiteInput): StoreSuiteInput {
    return {
      name: input.name.trim(),
      description: input.description.trim(),
      scenarioIds: input.scenarioIds
        .map((scenarioId) => scenarioId.trim())
        .filter((scenarioId) => scenarioId.length > 0),
    };
  }

  private mapStore(id: string, data: Record<string, unknown>): Store {
    return {
      id,
      organizationId: ((data.organizationId as string) ?? '').trim(),
      name: ((data.name as string) ?? '').trim(),
      site: ((data.site as string) ?? '').trim(),
      stage: ((data.stage as string) ?? '').trim(),
      scenarioCount: Number(data.scenarioCount ?? 0),
      createdAt: this.timestampToDate(data.createdAt),
      updatedAt: this.timestampToDate(data.updatedAt),
    };
  }

  private mapScenario(storeId: string, id: string, data: Record<string, unknown>): StoreScenario {
    return {
      id,
      storeId,
      title: ((data.title as string) ?? '').trim(),
      category: ((data.category as string) ?? '').trim(),
      automation: ((data.automation as string) ?? '').trim(),
      criticality: ((data.criticality as string) ?? '').trim(),
      observation: ((data.observation as string) ?? '').trim(),
      bdd: ((data.bdd as string) ?? '').trim(),
      createdAt: this.timestampToDate(data.createdAt),
      updatedAt: this.timestampToDate(data.updatedAt),
    };
  }

  private mapSuite(storeId: string, id: string, data: Record<string, unknown>): StoreSuite {
    const rawScenarioIds = Array.isArray(data.scenarioIds) ? (data.scenarioIds as string[]) : [];

    return {
      id,
      storeId,
      name: ((data.name as string) ?? '').trim(),
      description: ((data.description as string) ?? '').trim(),
      scenarioIds: rawScenarioIds
        .map((scenarioId) => scenarioId.trim())
        .filter((scenarioId) => scenarioId.length > 0),
      createdAt: this.timestampToDate(data.createdAt),
      updatedAt: this.timestampToDate(data.updatedAt),
    };
  }

  private mapCategory(storeId: string, id: string, data: Record<string, unknown>): StoreCategory {
    return {
      id,
      storeId,
      name: ((data.name as string) ?? '').trim(),
      createdAt: this.timestampToDate(data.createdAt),
      updatedAt: this.timestampToDate(data.updatedAt),
    };
  }

  private normalizeCategoryInput(input: StoreCategoryInput): StoreCategoryInput {
    return {
      name: input.name.trim(),
    };
  }

  private async updateScenarioCategories(
    storeId: string,
    previousName: string,
    newName: string,
  ): Promise<void> {
    const storeRef = doc(firebaseFirestore, STORES_COLLECTION, storeId);
    const scenariosCollection = collection(storeRef, SCENARIOS_SUBCOLLECTION);
    const scenariosQuery = query(scenariosCollection, where('category', '==', previousName));
    const snapshot = await getDocs(scenariosQuery);

    if (snapshot.empty) {
      return;
    }

    const batch = writeBatch(firebaseFirestore);
    snapshot.forEach((docSnapshot) => {
      batch.update(docSnapshot.ref, {
        category: newName,
        updatedAt: serverTimestamp(),
      });
    });

    await batch.commit();
  }

  private timestampToDate(value: unknown): Date | null {
    if (value instanceof Timestamp) {
      return value.toDate();
    }

    return null;
  }
}
