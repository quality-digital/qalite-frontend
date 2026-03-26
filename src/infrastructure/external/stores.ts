import {
  Timestamp,
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  limit,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  startAfter,
  updateDoc,
  type Query,
  type QueryDocumentSnapshot,
  type QuerySnapshot,
  type DocumentData,
  type Unsubscribe,
  where,
  writeBatch,
} from 'firebase/firestore';
import { buildStorageFileName, uploadFileAndGetUrl } from './storage';

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
} from '../../domain/entities/store';
import {
  normalizeAutomationEnum,
  normalizeCriticalityEnum,
} from '../../shared/utils/scenarioEnums';
import { isAutomatedScenario } from '../../shared/utils/automation';
import { firebaseFirestore } from '../database/firebase';
import { CacheStore } from '../cache/CacheStore';
import { fetchWithCache } from '../cache/cacheFetch';
import { getDocCacheFirst, getDocsCacheFirst, getDocsCacheThenServer } from './firestoreCache';

const STORES_COLLECTION = 'stores';
const SCENARIOS_SUBCOLLECTION = 'scenarios';
const SUITES_SUBCOLLECTION = 'suites';
const CATEGORIES_SUBCOLLECTION = 'categories';
const STORE_CACHE = new CacheStore({ namespace: 'stores', version: 'v1', ttlMs: 1000 * 60 * 5 });
const STORE_LIST_CACHE_KEY = 'listSummary';
const STORE_DETAIL_CACHE_PREFIX = 'detail:';
const SCENARIO_LIST_CACHE_PREFIX = 'scenarios:';
const SUITE_LIST_CACHE_PREFIX = 'suites:';
const STORE_PAGE_SIZE = 50;
const SCENARIOS_PAGE_SIZE = 50;
const SUITES_PAGE_SIZE = 50;

const timestampToDate = (value: unknown): Date | null => {
  if (value instanceof Timestamp) {
    return value.toDate();
  }

  return null;
};

const getStoreAutomationCounts = (data: Record<string, unknown>, scenarioCount: number) => {
  const automatedScenarioCount = Number(data.automatedScenarioCount ?? 0);
  const hasAutomatedField = data.automatedScenarioCount !== undefined;
  const hasNotAutomatedField = data.notAutomatedScenarioCount !== undefined;
  const hasAutomationCounts = hasAutomatedField || hasNotAutomatedField;
  const defaultNotAutomated = hasAutomationCounts
    ? Number(data.notAutomatedScenarioCount ?? Math.max(scenarioCount - automatedScenarioCount, 0))
    : scenarioCount;

  return {
    automatedScenarioCount,
    notAutomatedScenarioCount: Math.max(defaultNotAutomated, 0),
  };
};

const mapStore = (id: string, data: Record<string, unknown>): Store => {
  const scenarioCount = Number(data.scenarioCount ?? 0);
  const { automatedScenarioCount, notAutomatedScenarioCount } = getStoreAutomationCounts(
    data,
    scenarioCount,
  );

  return {
    id,
    organizationId: ((data.organizationId as string) ?? '').trim(),
    name: ((data.name as string) ?? '').trim(),
    site: ((data.site as string) ?? '').trim(),
    adminUrl: ((data.adminUrl as string) ?? '').trim(),
    stage: ((data.stage as string) ?? '').trim(),
    logoUrl: ((data.logoUrl as string) ?? '').trim() || null,
    slackWebhookUrl: ((data.slackWebhookUrl as string) ?? '').trim() || null,
    scenarioCount,
    automatedScenarioCount,
    notAutomatedScenarioCount,
    createdAt: timestampToDate(data.createdAt),
    updatedAt: timestampToDate(data.updatedAt),
  };
};

const getScenarioAutomationValue = (data: Record<string, unknown>) =>
  ((data.automation as string) ?? (data.automatizado as string) ?? '').trim();

const mapScenario = (
  storeId: string,
  id: string,
  data: Record<string, unknown>,
): StoreScenario => ({
  id,
  storeId,
  title: ((data.title as string) ?? '').trim(),
  category: ((data.category as string) ?? '').trim(),
  automation: normalizeAutomationEnum(getScenarioAutomationValue(data)) || '',
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

const getAutomationDeltas = (automation: string) => {
  const normalized = normalizeAutomationEnum(automation);
  return {
    automated: normalized === 'AUTOMATED' ? 1 : 0,
    notAutomated: normalized === 'NOT_AUTOMATED' ? 1 : 0,
  };
};

const listStoresFromServer = async (organizationId: string): Promise<Store[]> => {
  try {
    const storesCollection = collection(firebaseFirestore, STORES_COLLECTION);
    const storesQuery = query(
      storesCollection,
      where('organizationId', '==', organizationId),
      orderBy('name'),
    );

    const stores: Store[] = [];
    let lastDoc: QueryDocumentSnapshot | null = null;
    let hasMore = true;

    while (hasMore) {
      const pageQuery: Query<DocumentData> = lastDoc
        ? query(storesQuery, startAfter(lastDoc), limit(STORE_PAGE_SIZE))
        : query(storesQuery, limit(STORE_PAGE_SIZE));

      const snapshot: QuerySnapshot<DocumentData> = await getDocsCacheThenServer(pageQuery);

      snapshot.docs.forEach((docSnapshot: QueryDocumentSnapshot<DocumentData>) => {
        stores.push(mapStore(docSnapshot.id, docSnapshot.data({ serverTimestamps: 'estimate' })));
      });

      lastDoc = snapshot.docs[snapshot.docs.length - 1] ?? null;
      hasMore = Boolean(lastDoc && snapshot.size === STORE_PAGE_SIZE);
    }

    return stores;
  } catch (error) {
    console.error(error);
    const storesCollection = collection(firebaseFirestore, STORES_COLLECTION);
    const fallbackQuery = query(storesCollection, where('organizationId', '==', organizationId));
    const snapshot = await getDocsCacheThenServer(fallbackQuery);
    return snapshot.docs
      .map((docSnapshot) =>
        mapStore(docSnapshot.id, docSnapshot.data({ serverTimestamps: 'estimate' })),
      )
      .sort((a, b) => a.name.localeCompare(b.name));
  }
};

export const listStoresSummary = async (organizationId: string): Promise<Store[]> => {
  const cacheKey = `${STORE_LIST_CACHE_KEY}:${organizationId}`;
  return fetchWithCache({
    cache: STORE_CACHE,
    key: cacheKey,
    fetcher: () => listStoresFromServer(organizationId),
    fallback: [],
  });
};

export const listStores = listStoresSummary;

export const listenToStores = (
  organizationId: string,
  onChange: (stores: Store[]) => void,
  onError?: (error: Error) => void,
): Unsubscribe => {
  const storesCollection = collection(firebaseFirestore, STORES_COLLECTION);
  const storesQuery = query(storesCollection, where('organizationId', '==', organizationId));

  return onSnapshot(
    storesQuery,
    (snapshot) => {
      const stores = snapshot.docs.map((docSnapshot) =>
        mapStore(docSnapshot.id, docSnapshot.data({ serverTimestamps: 'estimate' })),
      );
      onChange(stores.sort((a, b) => a.name.localeCompare(b.name)));
    },
    (error) => {
      onError?.(error);
    },
  );
};

const getStoreFromServer = async (storeId: string): Promise<Store | null> => {
  const storeRef = doc(firebaseFirestore, STORES_COLLECTION, storeId);
  const snapshot = await getDocCacheFirst(storeRef);
  return snapshot.exists()
    ? mapStore(snapshot.id, snapshot.data({ serverTimestamps: 'estimate' }) ?? {})
    : null;
};

export const getStoreDetail = async (storeId: string): Promise<Store | null> => {
  if (!storeId) {
    return null;
  }

  const cacheKey = `${STORE_DETAIL_CACHE_PREFIX}${storeId}`;
  return fetchWithCache({
    cache: STORE_CACHE,
    key: cacheKey,
    fetcher: () => getStoreFromServer(storeId),
    fallback: null,
    store: (store) => {
      if (store) {
        STORE_CACHE.set(cacheKey, store);
      } else {
        STORE_CACHE.remove(cacheKey);
      }
    },
  });
};

export const getStore = getStoreDetail;

export const createStore = async (payload: CreateStorePayload): Promise<Store> => {
  const storesCollection = collection(firebaseFirestore, STORES_COLLECTION);
  const now = new Date();
  const docRef = await addDoc(storesCollection, {
    organizationId: payload.organizationId,
    name: payload.name.trim(),
    site: payload.site.trim(),
    adminUrl: payload.adminUrl?.trim() || '',
    stage: payload.stage.trim(),
    logoUrl: payload.logoUrl?.trim() || null,
    slackWebhookUrl: payload.slackWebhookUrl?.trim() || null,
    scenarioCount: 0,
    automatedScenarioCount: 0,
    notAutomatedScenarioCount: 0,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  const store: Store = {
    id: docRef.id,
    organizationId: payload.organizationId,
    name: payload.name.trim(),
    site: payload.site.trim(),
    adminUrl: payload.adminUrl?.trim() || '',
    stage: payload.stage.trim(),
    logoUrl: payload.logoUrl?.trim() || null,
    slackWebhookUrl: payload.slackWebhookUrl?.trim() || null,
    scenarioCount: 0,
    automatedScenarioCount: 0,
    notAutomatedScenarioCount: 0,
    createdAt: now,
    updatedAt: now,
  };

  STORE_CACHE.set(`${STORE_DETAIL_CACHE_PREFIX}${store.id}`, store);
  STORE_CACHE.invalidatePrefix(`${STORE_LIST_CACHE_KEY}:`);

  return store;
};

export const updateStore = async (storeId: string, payload: UpdateStorePayload): Promise<Store> => {
  const storeRef = doc(firebaseFirestore, STORES_COLLECTION, storeId);
  await updateDoc(storeRef, {
    name: payload.name.trim(),
    site: payload.site.trim(),
    adminUrl: payload.adminUrl?.trim() || '',
    stage: payload.stage.trim(),
    ...(payload.logoUrl !== undefined ? { logoUrl: payload.logoUrl?.trim() || null } : {}),
    ...(payload.slackWebhookUrl !== undefined
      ? { slackWebhookUrl: payload.slackWebhookUrl?.trim() || null }
      : {}),
    updatedAt: serverTimestamp(),
  });

  const snapshot = await getDocCacheFirst(storeRef);
  const updated = mapStore(snapshot.id, snapshot.data({ serverTimestamps: 'estimate' }) ?? {});

  STORE_CACHE.set(`${STORE_DETAIL_CACHE_PREFIX}${storeId}`, updated);
  STORE_CACHE.invalidatePrefix(`${STORE_LIST_CACHE_KEY}:`);

  return updated;
};

export const uploadStoreLogo = async (storeId: string, file: File): Promise<string> => {
  const fileName = buildStorageFileName(file);
  return uploadFileAndGetUrl(`stores/${storeId}/logo/${fileName}`, file);
};

export const deleteStore = async (storeId: string): Promise<void> => {
  const storeRef = doc(firebaseFirestore, STORES_COLLECTION, storeId);
  const snapshot = await getDoc(storeRef);

  if (!snapshot.exists()) {
    throw new Error('Loja não encontrada.');
  }

  const scenariosCollection = collection(storeRef, SCENARIOS_SUBCOLLECTION);
  const scenariosSnapshot = await getDocsCacheFirst(scenariosCollection);
  const categoriesCollection = collection(storeRef, CATEGORIES_SUBCOLLECTION);
  const categoriesSnapshot = await getDocsCacheFirst(categoriesCollection);

  const batch = writeBatch(firebaseFirestore);
  scenariosSnapshot.forEach((scenarioDoc) => {
    batch.delete(scenarioDoc.ref);
  });
  categoriesSnapshot.forEach((categoryDoc) => {
    batch.delete(categoryDoc.ref);
  });

  batch.delete(storeRef);
  await batch.commit();
  STORE_CACHE.remove(`${STORE_DETAIL_CACHE_PREFIX}${storeId}`);
  STORE_CACHE.invalidatePrefix(`${STORE_LIST_CACHE_KEY}:`);
};

const listScenariosFromServer = async (storeId: string): Promise<StoreScenario[]> => {
  const storeRef = doc(firebaseFirestore, STORES_COLLECTION, storeId);
  const scenariosCollection = collection(storeRef, SCENARIOS_SUBCOLLECTION);
  const scenariosQuery = query(scenariosCollection, orderBy('title'));
  const scenarios: StoreScenario[] = [];
  let lastDoc: QueryDocumentSnapshot | null = null;
  let hasMore = true;

  while (hasMore) {
    const pageQuery: Query<DocumentData> = lastDoc
      ? query(scenariosQuery, startAfter(lastDoc), limit(SCENARIOS_PAGE_SIZE))
      : query(scenariosQuery, limit(SCENARIOS_PAGE_SIZE));
    const snapshot: QuerySnapshot<DocumentData> = await getDocsCacheThenServer(pageQuery);
    snapshot.docs.forEach((docSnapshot: QueryDocumentSnapshot<DocumentData>) => {
      scenarios.push(
        mapScenario(storeId, docSnapshot.id, docSnapshot.data({ serverTimestamps: 'estimate' })),
      );
    });

    lastDoc = snapshot.docs[snapshot.docs.length - 1] ?? null;
    hasMore = Boolean(lastDoc && snapshot.size === SCENARIOS_PAGE_SIZE);
  }

  const automatedScenarioCount = scenarios.filter((scenario) =>
    isAutomatedScenario(scenario.automation),
  ).length;
  const scenarioCount = scenarios.length;
  const notAutomatedScenarioCount = Math.max(scenarioCount - automatedScenarioCount, 0);

  await updateDoc(storeRef, {
    scenarioCount,
    automatedScenarioCount,
    notAutomatedScenarioCount,
    updatedAt: serverTimestamp(),
  });

  return scenarios;
};

export const listScenarios = async (storeId: string): Promise<StoreScenario[]> => {
  if (!storeId) {
    return [];
  }

  const cacheKey = `${SCENARIO_LIST_CACHE_PREFIX}${storeId}`;
  return fetchWithCache({
    cache: STORE_CACHE,
    key: cacheKey,
    fetcher: () => listScenariosFromServer(storeId),
    fallback: [],
  });
};

export const listenToScenarios = (
  storeId: string,
  onChange: (scenarios: StoreScenario[]) => void,
  onError?: (error: Error) => void,
): Unsubscribe => {
  const storeRef = doc(firebaseFirestore, STORES_COLLECTION, storeId);
  const scenariosCollection = collection(storeRef, SCENARIOS_SUBCOLLECTION);
  const scenariosQuery = query(scenariosCollection, orderBy('title'));

  return onSnapshot(
    scenariosQuery,
    (snapshot) => {
      const scenarios = snapshot.docs.map((docSnapshot) =>
        mapScenario(storeId, docSnapshot.id, docSnapshot.data({ serverTimestamps: 'estimate' })),
      );
      onChange(scenarios);
    },
    (error) => onError?.(error),
  );
};

export const createScenario = async (
  payload: CreateStoreScenarioPayload,
): Promise<StoreScenario> => {
  const { storeId, ...scenarioInput } = payload;
  const storeRef = doc(firebaseFirestore, STORES_COLLECTION, storeId);
  const scenariosCollection = collection(storeRef, SCENARIOS_SUBCOLLECTION);
  const normalizedScenario = normalizeScenarioInput(scenarioInput);
  const now = new Date();

  const scenarioRef = await runTransaction(firebaseFirestore, async (transaction) => {
    const storeSnapshot = await transaction.get(storeRef);

    if (!storeSnapshot.exists()) {
      throw new Error('Loja não encontrada.');
    }

    const newScenarioRef = doc(scenariosCollection);
    transaction.set(newScenarioRef, {
      ...normalizedScenario,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    const storeData = storeSnapshot.data({ serverTimestamps: 'estimate' }) ?? {};
    const currentCount = Number(storeData?.scenarioCount ?? 0);
    const { automatedScenarioCount, notAutomatedScenarioCount } = getStoreAutomationCounts(
      storeData,
      currentCount,
    );
    const automationDelta = getAutomationDeltas(normalizedScenario.automation);
    transaction.update(storeRef, {
      scenarioCount: currentCount + 1,
      automatedScenarioCount: automatedScenarioCount + automationDelta.automated,
      notAutomatedScenarioCount: notAutomatedScenarioCount + automationDelta.notAutomated,
      updatedAt: serverTimestamp(),
    });

    return newScenarioRef;
  });

  const scenario: StoreScenario = {
    id: scenarioRef.id,
    storeId,
    title: normalizedScenario.title,
    category: normalizedScenario.category,
    automation: normalizedScenario.automation || '',
    criticality: normalizedScenario.criticality || '',
    observation: normalizedScenario.observation,
    bdd: normalizedScenario.bdd,
    createdAt: now,
    updatedAt: now,
  };

  STORE_CACHE.remove(`${STORE_DETAIL_CACHE_PREFIX}${storeId}`);
  STORE_CACHE.remove(`${SCENARIO_LIST_CACHE_PREFIX}${storeId}`);
  STORE_CACHE.invalidatePrefix(`${STORE_LIST_CACHE_KEY}:`);

  return scenario;
};

export const updateScenario = async (
  storeId: string,
  scenarioId: string,
  payload: StoreScenarioInput,
): Promise<StoreScenario> => {
  const storeRef = doc(firebaseFirestore, STORES_COLLECTION, storeId);
  const scenarioRef = doc(storeRef, SCENARIOS_SUBCOLLECTION, scenarioId);
  const normalizedScenario = normalizeScenarioInput(payload);

  await runTransaction(firebaseFirestore, async (transaction) => {
    const [storeSnapshot, scenarioSnapshot] = await Promise.all([
      transaction.get(storeRef),
      transaction.get(scenarioRef),
    ]);

    if (!storeSnapshot.exists()) {
      throw new Error('Loja não encontrada.');
    }

    if (!scenarioSnapshot.exists()) {
      throw new Error('Cenário não encontrado.');
    }

    const storeData = storeSnapshot.data({ serverTimestamps: 'estimate' }) ?? {};
    const currentCount = Number(storeData?.scenarioCount ?? 0);
    const { automatedScenarioCount, notAutomatedScenarioCount } = getStoreAutomationCounts(
      storeData,
      currentCount,
    );
    const previousAutomation = normalizeAutomationEnum(
      getScenarioAutomationValue(
        (scenarioSnapshot.data({ serverTimestamps: 'estimate' }) ?? {}) as Record<string, unknown>,
      ),
    );
    const nextAutomation = normalizeAutomationEnum(normalizedScenario.automation);
    const automationDelta = getAutomationDeltas(nextAutomation);
    const previousDelta = getAutomationDeltas(previousAutomation);
    const automatedDelta = automationDelta.automated - previousDelta.automated;
    const notAutomatedDelta = automationDelta.notAutomated - previousDelta.notAutomated;

    transaction.update(scenarioRef, {
      ...normalizedScenario,
      updatedAt: serverTimestamp(),
    });
    transaction.update(storeRef, {
      automatedScenarioCount: Math.max(automatedScenarioCount + automatedDelta, 0),
      notAutomatedScenarioCount: Math.max(notAutomatedScenarioCount + notAutomatedDelta, 0),
      updatedAt: serverTimestamp(),
    });
  });

  const scenarioSnapshot = await getDocCacheFirst(scenarioRef);
  const updatedScenario = mapScenario(
    storeId,
    scenarioSnapshot.id,
    scenarioSnapshot.data({ serverTimestamps: 'estimate' }) ?? {},
  );

  STORE_CACHE.remove(`${SCENARIO_LIST_CACHE_PREFIX}${storeId}`);

  return updatedScenario;
};

export const deleteScenario = async (storeId: string, scenarioId: string): Promise<void> => {
  const storeRef = doc(firebaseFirestore, STORES_COLLECTION, storeId);
  const scenarioRef = doc(storeRef, SCENARIOS_SUBCOLLECTION, scenarioId);

  await runTransaction(firebaseFirestore, async (transaction) => {
    const [storeSnapshot, scenarioSnapshot] = await Promise.all([
      transaction.get(storeRef),
      transaction.get(scenarioRef),
    ]);
    if (!storeSnapshot.exists()) {
      throw new Error('Loja não encontrada.');
    }
    if (!scenarioSnapshot.exists()) {
      throw new Error('Cenário não encontrado.');
    }

    transaction.delete(scenarioRef);

    const storeData = storeSnapshot.data({ serverTimestamps: 'estimate' }) ?? {};
    const currentCount = Number(storeData?.scenarioCount ?? 0);
    const { automatedScenarioCount, notAutomatedScenarioCount } = getStoreAutomationCounts(
      storeData,
      currentCount,
    );
    const automationDelta = getAutomationDeltas(
      getScenarioAutomationValue(
        (scenarioSnapshot.data({ serverTimestamps: 'estimate' }) ?? {}) as Record<string, unknown>,
      ),
    );
    transaction.update(storeRef, {
      scenarioCount: Math.max(currentCount - 1, 0),
      automatedScenarioCount: Math.max(automatedScenarioCount - automationDelta.automated, 0),
      notAutomatedScenarioCount: Math.max(
        notAutomatedScenarioCount - automationDelta.notAutomated,
        0,
      ),
      updatedAt: serverTimestamp(),
    });
  });

  STORE_CACHE.remove(`${STORE_DETAIL_CACHE_PREFIX}${storeId}`);
  STORE_CACHE.remove(`${SCENARIO_LIST_CACHE_PREFIX}${storeId}`);
  STORE_CACHE.invalidatePrefix(`${STORE_LIST_CACHE_KEY}:`);
};

const listSuitesFromServer = async (storeId: string): Promise<StoreSuite[]> => {
  const storeRef = doc(firebaseFirestore, STORES_COLLECTION, storeId);
  const suitesCollection = collection(storeRef, SUITES_SUBCOLLECTION);
  const suitesQuery = query(suitesCollection, orderBy('name'));
  const suites: StoreSuite[] = [];
  let lastDoc: QueryDocumentSnapshot | null = null;
  let hasMore = true;

  while (hasMore) {
    const pageQuery: Query<DocumentData> = lastDoc
      ? query(suitesQuery, startAfter(lastDoc), limit(SUITES_PAGE_SIZE))
      : query(suitesQuery, limit(SUITES_PAGE_SIZE));
    const snapshot: QuerySnapshot<DocumentData> = await getDocsCacheThenServer(pageQuery);
    snapshot.docs.forEach((docSnapshot: QueryDocumentSnapshot<DocumentData>) => {
      suites.push(
        mapSuite(storeId, docSnapshot.id, docSnapshot.data({ serverTimestamps: 'estimate' })),
      );
    });

    lastDoc = snapshot.docs[snapshot.docs.length - 1] ?? null;
    hasMore = Boolean(lastDoc && snapshot.size === SUITES_PAGE_SIZE);
  }

  return suites;
};

export const listSuites = async (storeId: string): Promise<StoreSuite[]> => {
  if (!storeId) {
    return [];
  }

  const cacheKey = `${SUITE_LIST_CACHE_PREFIX}${storeId}`;
  return fetchWithCache({
    cache: STORE_CACHE,
    key: cacheKey,
    fetcher: () => listSuitesFromServer(storeId),
    fallback: [],
  });
};

export const createSuite = async (
  payload: { storeId: string } & StoreSuiteInput,
): Promise<StoreSuite> => {
  const storeRef = doc(firebaseFirestore, STORES_COLLECTION, payload.storeId);
  const storeSnapshot = await getDocCacheFirst(storeRef);

  if (!storeSnapshot.exists()) {
    throw new Error('Loja não encontrada.');
  }

  const suitesCollection = collection(storeRef, SUITES_SUBCOLLECTION);
  const normalized = normalizeSuiteInput(payload);
  const now = new Date();
  const suiteRef = await addDoc(suitesCollection, {
    ...normalized,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  const suite: StoreSuite = {
    id: suiteRef.id,
    storeId: payload.storeId,
    name: normalized.name,
    description: normalized.description,
    scenarioIds: normalized.scenarioIds,
    createdAt: now,
    updatedAt: now,
  };

  STORE_CACHE.remove(`${SUITE_LIST_CACHE_PREFIX}${payload.storeId}`);

  return suite;
};

export const updateSuite = async (
  storeId: string,
  suiteId: string,
  payload: StoreSuiteInput,
): Promise<StoreSuite> => {
  const storeRef = doc(firebaseFirestore, STORES_COLLECTION, storeId);
  const suiteRef = doc(storeRef, SUITES_SUBCOLLECTION, suiteId);
  const suiteSnapshot = await getDocCacheFirst(suiteRef);

  if (!suiteSnapshot.exists()) {
    throw new Error('Suite de testes não encontrada.');
  }

  await updateDoc(suiteRef, {
    ...normalizeSuiteInput(payload),
    updatedAt: serverTimestamp(),
  });

  const updatedSnapshot = await getDocCacheFirst(suiteRef);
  const updatedSuite = mapSuite(
    storeId,
    updatedSnapshot.id,
    updatedSnapshot.data({ serverTimestamps: 'estimate' }) ?? {},
  );

  STORE_CACHE.remove(`${SUITE_LIST_CACHE_PREFIX}${storeId}`);

  return updatedSuite;
};

export const deleteSuite = async (storeId: string, suiteId: string): Promise<void> => {
  const storeRef = doc(firebaseFirestore, STORES_COLLECTION, storeId);
  const suiteRef = doc(storeRef, SUITES_SUBCOLLECTION, suiteId);
  const snapshot = await getDocCacheFirst(suiteRef);

  if (!snapshot.exists()) {
    throw new Error('Suite de testes não encontrada.');
  }

  await deleteDoc(suiteRef);
  STORE_CACHE.remove(`${SUITE_LIST_CACHE_PREFIX}${storeId}`);
};

export const listCategories = async (storeId: string): Promise<StoreCategory[]> => {
  const storeRef = doc(firebaseFirestore, STORES_COLLECTION, storeId);
  const categoriesCollection = collection(storeRef, CATEGORIES_SUBCOLLECTION);
  const categoriesQuery = query(categoriesCollection, orderBy('searchName'));
  try {
    const snapshot = await getDocsCacheThenServer(categoriesQuery);
    return snapshot.docs.map((docSnapshot) =>
      mapCategory(storeId, docSnapshot.id, docSnapshot.data({ serverTimestamps: 'estimate' })),
    );
  } catch (error) {
    console.error(error);
    return [];
  }
};

export const listenToCategories = (
  storeId: string,
  onChange: (categories: StoreCategory[]) => void,
  onError?: (error: Error) => void,
): Unsubscribe => {
  const storeRef = doc(firebaseFirestore, STORES_COLLECTION, storeId);
  const categoriesCollection = collection(storeRef, CATEGORIES_SUBCOLLECTION);
  const categoriesQuery = query(categoriesCollection, orderBy('searchName'));

  return onSnapshot(
    categoriesQuery,
    (snapshot) => {
      const categories = snapshot.docs.map((docSnapshot) =>
        mapCategory(storeId, docSnapshot.id, docSnapshot.data({ serverTimestamps: 'estimate' })),
      );
      onChange(categories);
    },
    (error) => onError?.(error),
  );
};

export const createCategory = async (
  payload: { storeId: string } & StoreCategoryInput,
): Promise<StoreCategory> => {
  const storeRef = doc(firebaseFirestore, STORES_COLLECTION, payload.storeId);
  const storeSnapshot = await getDocCacheFirst(storeRef);

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
  const existingSnapshot = await getDocsCacheFirst(existingQuery);

  if (!existingSnapshot.empty) {
    throw new Error('Já existe uma categoria com este nome.');
  }

  const categoryRef = await addDoc(categoriesCollection, {
    name,
    searchName,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  const now = new Date();
  return {
    id: categoryRef.id,
    storeId: payload.storeId,
    name,
    createdAt: now,
    updatedAt: now,
  };
};

export const updateCategory = async (
  storeId: string,
  categoryId: string,
  payload: StoreCategoryInput,
): Promise<StoreCategory> => {
  const storeRef = doc(firebaseFirestore, STORES_COLLECTION, storeId);
  const categoryRef = doc(storeRef, CATEGORIES_SUBCOLLECTION, categoryId);
  const categorySnapshot = await getDocCacheFirst(categoryRef);

  if (!categorySnapshot.exists()) {
    throw new Error('Categoria não encontrada.');
  }

  const previousName = (
    (categorySnapshot.data({ serverTimestamps: 'estimate' })?.name as string) ?? ''
  ).trim();
  const { name } = normalizeCategoryInput(payload);
  if (!name) {
    throw new Error('Informe o nome da categoria.');
  }

  const searchName = name.toLowerCase();
  const categoriesCollection = collection(storeRef, CATEGORIES_SUBCOLLECTION);
  const existingQuery = query(categoriesCollection, where('searchName', '==', searchName));
  const existingSnapshot = await getDocsCacheFirst(existingQuery);
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

  const updatedSnapshot = await getDocCacheFirst(categoryRef);
  return mapCategory(
    storeId,
    updatedSnapshot.id,
    updatedSnapshot.data({ serverTimestamps: 'estimate' }) ?? {},
  );
};

export const deleteCategory = async (
  storeId: string,
  categoryId: string,
  options: { allowDeleteWithScenarios?: boolean } = {},
): Promise<void> => {
  const storeRef = doc(firebaseFirestore, STORES_COLLECTION, storeId);
  const categoryRef = doc(storeRef, CATEGORIES_SUBCOLLECTION, categoryId);
  const snapshot = await getDocCacheFirst(categoryRef);

  if (!snapshot.exists()) {
    throw new Error('Categoria não encontrada.');
  }

  if (!options.allowDeleteWithScenarios) {
    const scenariosCollection = collection(storeRef, SCENARIOS_SUBCOLLECTION);
    const scenariosQuery = query(
      scenariosCollection,
      where('category', '==', snapshot.data({ serverTimestamps: 'estimate' })?.name),
    );
    const scenariosSnapshot = await getDocsCacheFirst(scenariosQuery);

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
  const snapshot = await getDocsCacheFirst(scenariosQuery);

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
      adminUrl: store.adminUrl,
      stage: store.stage,
      logoUrl: store.logoUrl,
      slackWebhookUrl: store.slackWebhookUrl,
      scenarioCount: scenarios.length,
    },
    exportedAt: new Date().toISOString(),
    scenarios,
  };
};
