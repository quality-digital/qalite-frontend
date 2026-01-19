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
} from '../../domain/entities/store';
import {
  normalizeAutomationEnum,
  normalizeCriticalityEnum,
} from '../../shared/utils/scenarioEnums';
import { firebaseFirestore } from '../database/firebase';
import { logActivity } from './logs';

const STORES_COLLECTION = 'stores';
const SCENARIOS_SUBCOLLECTION = 'scenarios';
const SUITES_SUBCOLLECTION = 'suites';
const CATEGORIES_SUBCOLLECTION = 'categories';

const getStoreContext = async (
  storeId: string,
  snapshotData?: Record<string, unknown> | null,
): Promise<{ organizationId: string | null; storeName: string }> => {
  if (snapshotData) {
    return {
      organizationId: (snapshotData.organizationId as string | undefined | null) ?? null,
      storeName: (snapshotData.name as string | undefined) ?? '',
    };
  }

  const storeRef = doc(firebaseFirestore, STORES_COLLECTION, storeId);
  const snapshot = await getDoc(storeRef);

  if (!snapshot.exists()) {
    return { organizationId: null, storeName: '' };
  }

  const data = snapshot.data();
  return {
    organizationId: (data.organizationId as string | undefined | null) ?? null,
    storeName: (data.name as string | undefined) ?? '',
  };
};

const timestampToDate = (value: unknown): Date | null => {
  if (value instanceof Timestamp) {
    return value.toDate();
  }

  return null;
};

const mapStore = (id: string, data: Record<string, unknown>): Store => ({
  id,
  organizationId: ((data.organizationId as string) ?? '').trim(),
  name: ((data.name as string) ?? '').trim(),
  site: ((data.site as string) ?? '').trim(),
  stage: ((data.stage as string) ?? '').trim(),
  scenarioCount: Number(data.scenarioCount ?? 0),
  createdAt: timestampToDate(data.createdAt),
  updatedAt: timestampToDate(data.updatedAt),
});

const mapScenario = (
  storeId: string,
  id: string,
  data: Record<string, unknown>,
): StoreScenario => ({
  id,
  storeId,
  title: ((data.title as string) ?? '').trim(),
  category: ((data.category as string) ?? '').trim(),
  automation: normalizeAutomationEnum((data.automation as string) ?? '') || '',
  criticality: normalizeCriticalityEnum((data.criticality as string) ?? '') || '',
  observation: ((data.observation as string) ?? '').trim(),
  bdd: ((data.bdd as string) ?? '').trim(),
  createdAt: timestampToDate(data.createdAt),
  updatedAt: timestampToDate(data.updatedAt),
});

const mapSuite = (storeId: string, id: string, data: Record<string, unknown>): StoreSuite => {
  const rawScenarioIds = Array.isArray(data.scenarioIds) ? (data.scenarioIds as string[]) : [];

  return {
    id,
    storeId,
    name: ((data.name as string) ?? '').trim(),
    description: ((data.description as string) ?? '').trim(),
    scenarioIds: rawScenarioIds
      .map((scenarioId) => scenarioId.trim())
      .filter((scenarioId) => scenarioId.length > 0),
    createdAt: timestampToDate(data.createdAt),
    updatedAt: timestampToDate(data.updatedAt),
  };
};

const mapCategory = (
  storeId: string,
  id: string,
  data: Record<string, unknown>,
): StoreCategory => ({
  id,
  storeId,
  name: ((data.name as string) ?? '').trim(),
  createdAt: timestampToDate(data.createdAt),
  updatedAt: timestampToDate(data.updatedAt),
});

const normalizeScenarioInput = (input: StoreScenarioInput): StoreScenarioInput => ({
  title: input.title.trim(),
  category: input.category.trim(),
  automation: normalizeAutomationEnum(input.automation.trim()),
  criticality: normalizeCriticalityEnum(input.criticality.trim()),
  observation: input.observation.trim(),
  bdd: input.bdd.trim(),
});

const normalizeSuiteInput = (input: StoreSuiteInput): StoreSuiteInput => ({
  name: input.name.trim(),
  description: input.description.trim(),
  scenarioIds: input.scenarioIds
    .map((scenarioId) => scenarioId.trim())
    .filter((scenarioId) => scenarioId.length > 0),
});

const normalizeCategoryInput = (input: StoreCategoryInput): StoreCategoryInput => ({
  name: input.name.trim(),
});

export const listStores = async (organizationId: string): Promise<Store[]> => {
  const storesCollection = collection(firebaseFirestore, STORES_COLLECTION);
  const storesQuery = query(storesCollection, where('organizationId', '==', organizationId));
  const snapshot = await getDocs(storesQuery);
  const stores = snapshot.docs.map((docSnapshot) => mapStore(docSnapshot.id, docSnapshot.data()));
  return stores.sort((a, b) => a.name.localeCompare(b.name));
};

export const getStore = async (storeId: string): Promise<Store | null> => {
  const storeRef = doc(firebaseFirestore, STORES_COLLECTION, storeId);
  const snapshot = await getDoc(storeRef);
  return snapshot.exists() ? mapStore(snapshot.id, snapshot.data() ?? {}) : null;
};

export const createStore = async (payload: CreateStorePayload): Promise<Store> => {
  const storesCollection = collection(firebaseFirestore, STORES_COLLECTION);
  const docRef = await addDoc(storesCollection, {
    organizationId: payload.organizationId,
    name: payload.name.trim(),
    site: payload.site.trim(),
    stage: payload.stage.trim(),
    scenarioCount: 0,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  const snapshot = await getDoc(docRef);
  const createdStore = mapStore(snapshot.id, snapshot.data() ?? {});

  await logActivity({
    organizationId: payload.organizationId,
    entityId: createdStore.id,
    entityType: 'store',
    action: 'create',
    message: `Loja criada: ${createdStore.name}`,
  });

  return createdStore;
};

export const updateStore = async (storeId: string, payload: UpdateStorePayload): Promise<Store> => {
  const storeRef = doc(firebaseFirestore, STORES_COLLECTION, storeId);
  await updateDoc(storeRef, {
    name: payload.name.trim(),
    site: payload.site.trim(),
    stage: payload.stage.trim(),
    updatedAt: serverTimestamp(),
  });

  const snapshot = await getDoc(storeRef);
  const updated = mapStore(snapshot.id, snapshot.data() ?? {});

  await logActivity({
    organizationId: updated.organizationId,
    entityId: updated.id,
    entityType: 'store',
    action: 'update',
    message: `Loja atualizada: ${updated.name}`,
  });

  return updated;
};

export const deleteStore = async (storeId: string): Promise<void> => {
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

  const context = await getStoreContext(storeId, snapshot.data() ?? {});
  if (context.organizationId) {
    await logActivity({
      organizationId: context.organizationId,
      entityId: storeId,
      entityType: 'store',
      action: 'delete',
      message: `Loja removida: ${context.storeName || storeId}`,
    });
  }
};

export const listScenarios = async (storeId: string): Promise<StoreScenario[]> => {
  const storeRef = doc(firebaseFirestore, STORES_COLLECTION, storeId);
  const scenariosCollection = collection(storeRef, SCENARIOS_SUBCOLLECTION);
  const scenariosQuery = query(scenariosCollection, orderBy('title'));
  const snapshot = await getDocs(scenariosQuery);
  return snapshot.docs.map((docSnapshot) =>
    mapScenario(storeId, docSnapshot.id, docSnapshot.data()),
  );
};

export const createScenario = async (
  payload: { storeId: string } & StoreScenarioInput,
): Promise<StoreScenario> => {
  const storeRef = doc(firebaseFirestore, STORES_COLLECTION, payload.storeId);
  const scenariosCollection = collection(storeRef, SCENARIOS_SUBCOLLECTION);

  let storeData: Record<string, unknown> | null = null;

  const scenarioRef = await runTransaction(firebaseFirestore, async (transaction) => {
    const storeSnapshot = await transaction.get(storeRef);

    if (!storeSnapshot.exists()) {
      throw new Error('Loja não encontrada.');
    }

    storeData = storeSnapshot.data();

    const newScenarioRef = doc(scenariosCollection);
    transaction.set(newScenarioRef, {
      ...normalizeScenarioInput(payload),
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
  const createdScenario = mapScenario(
    payload.storeId,
    scenarioSnapshot.id,
    scenarioSnapshot.data() ?? {},
  );

  const context = await getStoreContext(payload.storeId, storeData);
  if (context.organizationId) {
    await logActivity({
      organizationId: context.organizationId,
      entityId: createdScenario.id,
      entityType: 'scenario',
      action: 'create',
      message: `Cenário criado: ${createdScenario.title} (${context.storeName || 'Loja'})`,
    });
  }

  return createdScenario;
};

export const updateScenario = async (
  storeId: string,
  scenarioId: string,
  payload: StoreScenarioInput,
): Promise<StoreScenario> => {
  const storeRef = doc(firebaseFirestore, STORES_COLLECTION, storeId);
  const scenarioRef = doc(storeRef, SCENARIOS_SUBCOLLECTION, scenarioId);

  await updateDoc(scenarioRef, {
    ...normalizeScenarioInput(payload),
    updatedAt: serverTimestamp(),
  });

  await updateDoc(storeRef, { updatedAt: serverTimestamp() });

  const scenarioSnapshot = await getDoc(scenarioRef);
  const updatedScenario = mapScenario(storeId, scenarioSnapshot.id, scenarioSnapshot.data() ?? {});

  const context = await getStoreContext(storeId);
  if (context.organizationId) {
    await logActivity({
      organizationId: context.organizationId,
      entityId: updatedScenario.id,
      entityType: 'scenario',
      action: 'update',
      message: `Cenário atualizado: ${updatedScenario.title} (${context.storeName || 'Loja'})`,
    });
  }

  return updatedScenario;
};

export const deleteScenario = async (storeId: string, scenarioId: string): Promise<void> => {
  const storeRef = doc(firebaseFirestore, STORES_COLLECTION, storeId);
  const scenarioRef = doc(storeRef, SCENARIOS_SUBCOLLECTION, scenarioId);

  let storeData: Record<string, unknown> | null = null;
  let scenarioTitle: string | null = null;

  await runTransaction(firebaseFirestore, async (transaction) => {
    const storeSnapshot = await transaction.get(storeRef);
    if (!storeSnapshot.exists()) {
      throw new Error('Loja não encontrada.');
    }

    storeData = storeSnapshot.data();

    const scenarioSnapshot = await transaction.get(scenarioRef);
    scenarioTitle = (scenarioSnapshot.data()?.title as string | undefined) ?? null;

    transaction.delete(scenarioRef);

    const currentCount = Number(storeSnapshot.data()?.scenarioCount ?? 0);
    transaction.update(storeRef, {
      scenarioCount: Math.max(currentCount - 1, 0),
      updatedAt: serverTimestamp(),
    });
  });

  const context = await getStoreContext(storeId, storeData);
  if (context.organizationId) {
    await logActivity({
      organizationId: context.organizationId,
      entityId: scenarioId,
      entityType: 'scenario',
      action: 'delete',
      message: `Cenário removido: ${scenarioTitle || scenarioId} (${context.storeName || 'Loja'})`,
    });
  }
};

export const listSuites = async (storeId: string): Promise<StoreSuite[]> => {
  const storeRef = doc(firebaseFirestore, STORES_COLLECTION, storeId);
  const suitesCollection = collection(storeRef, SUITES_SUBCOLLECTION);
  const suitesQuery = query(suitesCollection, orderBy('name'));
  const snapshot = await getDocs(suitesQuery);
  return snapshot.docs.map((docSnapshot) => mapSuite(storeId, docSnapshot.id, docSnapshot.data()));
};

export const createSuite = async (
  payload: { storeId: string } & StoreSuiteInput,
): Promise<StoreSuite> => {
  const storeRef = doc(firebaseFirestore, STORES_COLLECTION, payload.storeId);
  const storeSnapshot = await getDoc(storeRef);

  if (!storeSnapshot.exists()) {
    throw new Error('Loja não encontrada.');
  }

  const suitesCollection = collection(storeRef, SUITES_SUBCOLLECTION);
  const normalized = normalizeSuiteInput(payload);
  const suiteRef = await addDoc(suitesCollection, {
    ...normalized,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  const snapshot = await getDoc(suiteRef);
  const createdSuite = mapSuite(payload.storeId, snapshot.id, snapshot.data() ?? {});

  const context = await getStoreContext(payload.storeId, storeSnapshot.data());
  if (context.organizationId) {
    await logActivity({
      organizationId: context.organizationId,
      entityId: createdSuite.id,
      entityType: 'suite',
      action: 'create',
      message: `Suíte criada: ${createdSuite.name} (${context.storeName || 'Loja'})`,
    });
  }

  return createdSuite;
};

export const updateSuite = async (
  storeId: string,
  suiteId: string,
  payload: StoreSuiteInput,
): Promise<StoreSuite> => {
  const storeRef = doc(firebaseFirestore, STORES_COLLECTION, storeId);
  const suiteRef = doc(storeRef, SUITES_SUBCOLLECTION, suiteId);
  const suiteSnapshot = await getDoc(suiteRef);

  if (!suiteSnapshot.exists()) {
    throw new Error('Suite de testes não encontrada.');
  }

  await updateDoc(suiteRef, {
    ...normalizeSuiteInput(payload),
    updatedAt: serverTimestamp(),
  });

  const updatedSnapshot = await getDoc(suiteRef);
  const updatedSuite = mapSuite(storeId, updatedSnapshot.id, updatedSnapshot.data() ?? {});

  const context = await getStoreContext(storeId, suiteSnapshot.data() ?? {});
  if (context.organizationId) {
    await logActivity({
      organizationId: context.organizationId,
      entityId: updatedSuite.id,
      entityType: 'suite',
      action: 'update',
      message: `Suíte atualizada: ${updatedSuite.name} (${context.storeName || 'Loja'})`,
    });
  }

  return updatedSuite;
};

export const deleteSuite = async (storeId: string, suiteId: string): Promise<void> => {
  const storeRef = doc(firebaseFirestore, STORES_COLLECTION, storeId);
  const suiteRef = doc(storeRef, SUITES_SUBCOLLECTION, suiteId);
  const snapshot = await getDoc(suiteRef);

  if (!snapshot.exists()) {
    throw new Error('Suite de testes não encontrada.');
  }

  await deleteDoc(suiteRef);

  const context = await getStoreContext(storeId);
  if (context.organizationId) {
    await logActivity({
      organizationId: context.organizationId,
      entityId: suiteId,
      entityType: 'suite',
      action: 'delete',
      message: `Suíte removida: ${(snapshot.data()?.name as string | undefined) ?? suiteId} (${context.storeName || 'Loja'})`,
    });
  }
};

export const listCategories = async (storeId: string): Promise<StoreCategory[]> => {
  const storeRef = doc(firebaseFirestore, STORES_COLLECTION, storeId);
  const categoriesCollection = collection(storeRef, CATEGORIES_SUBCOLLECTION);
  const categoriesQuery = query(categoriesCollection, orderBy('searchName'));
  const snapshot = await getDocs(categoriesQuery);
  return snapshot.docs.map((docSnapshot) =>
    mapCategory(storeId, docSnapshot.id, docSnapshot.data()),
  );
};

export const createCategory = async (
  payload: { storeId: string } & StoreCategoryInput,
): Promise<StoreCategory> => {
  const storeRef = doc(firebaseFirestore, STORES_COLLECTION, payload.storeId);
  const storeSnapshot = await getDoc(storeRef);

  if (!storeSnapshot.exists()) {
    throw new Error('Loja não encontrada.');
  }

  const { name } = normalizeCategoryInput(payload);
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
  return mapCategory(payload.storeId, categorySnapshot.id, categorySnapshot.data() ?? {});
};

export const updateCategory = async (
  storeId: string,
  categoryId: string,
  payload: StoreCategoryInput,
): Promise<StoreCategory> => {
  const storeRef = doc(firebaseFirestore, STORES_COLLECTION, storeId);
  const categoryRef = doc(storeRef, CATEGORIES_SUBCOLLECTION, categoryId);
  const categorySnapshot = await getDoc(categoryRef);

  if (!categorySnapshot.exists()) {
    throw new Error('Categoria não encontrada.');
  }

  const previousName = ((categorySnapshot.data()?.name as string) ?? '').trim();
  const { name } = normalizeCategoryInput(payload);
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
    await updateScenarioCategories(storeId, previousName, name);
  }

  const updatedSnapshot = await getDoc(categoryRef);
  return mapCategory(storeId, updatedSnapshot.id, updatedSnapshot.data() ?? {});
};

export const deleteCategory = async (
  storeId: string,
  categoryId: string,
  options: { allowDeleteWithScenarios?: boolean } = {},
): Promise<void> => {
  const storeRef = doc(firebaseFirestore, STORES_COLLECTION, storeId);
  const categoryRef = doc(storeRef, CATEGORIES_SUBCOLLECTION, categoryId);
  const snapshot = await getDoc(categoryRef);

  if (!snapshot.exists()) {
    throw new Error('Categoria não encontrada.');
  }

  if (!options.allowDeleteWithScenarios) {
    const scenariosCollection = collection(storeRef, SCENARIOS_SUBCOLLECTION);
    const scenariosQuery = query(
      scenariosCollection,
      where('category', '==', snapshot.data()?.name),
    );
    const scenariosSnapshot = await getDocs(scenariosQuery);

    if (!scenariosSnapshot.empty) {
      throw new Error(
        'Não é possível remover uma categoria associada a cenários. Atualize ou remova os cenários primeiro.',
      );
    }
  }

  await deleteDoc(categoryRef);
};

const updateScenarioCategories = async (
  storeId: string,
  previousName: string,
  newName: string,
): Promise<void> => {
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
};

export const exportStoreData = async (storeId: string): Promise<StoreExportPayload> => {
  const store = await getStore(storeId);

  if (!store) {
    throw new Error('Loja não encontrada.');
  }

  const scenarios = await listScenarios(storeId);
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
};
