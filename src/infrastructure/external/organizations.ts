import {
  Timestamp,
  addDoc,
  collectionGroup,
  collection,
  deleteDoc,
  doc,
  documentId,
  getDoc,
  limit,
  onSnapshot,
  query,
  runTransaction,
  serverTimestamp,
  startAfter,
  orderBy,
  type Query,
  type QueryDocumentSnapshot,
  type QuerySnapshot,
  type DocumentData,
  type Unsubscribe,
  where,
  updateDoc,
  writeBatch,
} from 'firebase/firestore';

import type { BrowserstackCredentials } from '../../domain/entities/browserstack';
import type {
  CancelOrganizationAccessRequestPayload,
  Organization,
  OrganizationAccessRequest,
  OrganizationMember,
  RequestOrganizationAccessPayload,
} from '../../domain/entities/organization';
import { getNormalizedEmailDomain, normalizeEmailDomain } from '../../shared/utils/email';
import { firebaseFirestore } from '../database/firebase';
import { CacheStore } from '../cache/CacheStore';
import { fetchWithCache } from '../cache/cacheFetch';
import { buildStorageFileName, uploadFileAndGetUrl } from './storage';
import {
  getDocCacheFirst,
  getDocCacheThenServer,
  getDocsCacheFirst,
  getDocsCacheThenServer,
} from './firestoreCache';

const ORGANIZATIONS_COLLECTION = 'organizations';
const ACCESS_REQUESTS_SUBCOLLECTION = 'accessRequests';
const USERS_COLLECTION = 'users';
const ORGANIZATION_CACHE = new CacheStore({
  namespace: 'organizations',
  version: 'v1',
  ttlMs: 1000 * 60 * 5,
});
const ORGANIZATION_LIST_CACHE_KEY = 'listSummary';
const ORGANIZATION_DETAIL_CACHE_PREFIX = 'detail:';
const ORGANIZATION_PAGE_SIZE = 50;
const PENDING_ACCESS_STATUS = 'pending';

export interface CreateOrganizationPayload {
  name: string;
  description: string;
  slackWebhookUrl?: string | null;
  emailDomain?: string | null;
  additionalEnvironmentTypes?: string[];
  browserstackCredentials?: BrowserstackCredentials | null;
}

export interface UpdateOrganizationPayload {
  name: string;
  description: string;
  logoUrl?: string | null;
  slackWebhookUrl?: string | null;
  emailDomain?: string | null;
  additionalEnvironmentTypes?: string[];
  browserstackCredentials?: BrowserstackCredentials | null;
}

const normalizeAdditionalEnvironmentTypes = (values: unknown): string[] => {
  if (!Array.isArray(values)) {
    return [];
  }

  return values
    .map((value) => (typeof value === 'string' ? value.trim() : ''))
    .filter((value, index, array) => value.length > 0 && array.indexOf(value) === index);
};

export interface AddUserToOrganizationPayload {
  organizationId: string;
  userEmail: string;
}

export interface RemoveUserFromOrganizationPayload {
  organizationId: string;
  userId: string;
}

const organizationsCollection = collection(firebaseFirestore, ORGANIZATIONS_COLLECTION);
const accessRequestsCollection = (organizationId: string) =>
  collection(
    firebaseFirestore,
    ORGANIZATIONS_COLLECTION,
    organizationId,
    ACCESS_REQUESTS_SUBCOLLECTION,
  );

const normalizeBrowserstackCredentials = (
  credentials: BrowserstackCredentials | null | undefined,
): BrowserstackCredentials | null => {
  const username = credentials?.username?.trim() || '';
  const accessKey = credentials?.accessKey?.trim() || '';

  if (!username && !accessKey) {
    return null;
  }

  return { username, accessKey };
};

const mapAccessRequest = (
  organizationId: string,
  id: string,
  data: Record<string, unknown> | undefined,
): OrganizationAccessRequest => ({
  id,
  organizationId,
  userId: ((data?.userId as string) ?? '').trim(),
  email: ((data?.email as string) ?? '').trim(),
  displayName: ((data?.displayName as string) ?? '').trim(),
  photoURL: ((data?.photoURL as string | null) ?? null) || null,
  createdAt: timestampToDate(data?.createdAt),
  updatedAt: timestampToDate(data?.updatedAt),
});

const listPendingAccessRequests = async (
  organizationId: string,
): Promise<OrganizationAccessRequest[]> => {
  const snapshot = await getDocsCacheThenServer(
    query(accessRequestsCollection(organizationId), where('status', '==', PENDING_ACCESS_STATUS)),
  );

  return snapshot.docs
    .map((docSnapshot) =>
      mapAccessRequest(
        organizationId,
        docSnapshot.id,
        docSnapshot.data({ serverTimestamps: 'estimate' }),
      ),
    )
    .sort(
      (first, second) => (second.createdAt?.getTime() ?? 0) - (first.createdAt?.getTime() ?? 0),
    );
};

const listOrganizationsFromServer = async (): Promise<Organization[]> => {
  const organizations: Organization[] = [];
  let lastDoc: QueryDocumentSnapshot | null = null;
  let hasMore = true;

  while (hasMore) {
    const pageQuery: Query<DocumentData> = lastDoc
      ? query(
          organizationsCollection,
          orderBy('name'),
          startAfter(lastDoc),
          limit(ORGANIZATION_PAGE_SIZE),
        )
      : query(organizationsCollection, orderBy('name'), limit(ORGANIZATION_PAGE_SIZE));

    const snapshot: QuerySnapshot<DocumentData> = await getDocsCacheThenServer(pageQuery);
    const pageItems = snapshot.docs.map((docSnapshot: QueryDocumentSnapshot<DocumentData>) =>
      mapOrganizationSummary(docSnapshot.id, docSnapshot.data({ serverTimestamps: 'estimate' })),
    );

    organizations.push(...pageItems);
    lastDoc = snapshot.docs[snapshot.docs.length - 1] ?? null;
    hasMore = Boolean(lastDoc && snapshot.size === ORGANIZATION_PAGE_SIZE);
  }

  return organizations;
};

export const listOrganizationsSummary = async (): Promise<Organization[]> => {
  return fetchWithCache({
    cache: ORGANIZATION_CACHE,
    key: ORGANIZATION_LIST_CACHE_KEY,
    fetcher: listOrganizationsFromServer,
    fallback: [],
  });
};

export const listOrganizations = listOrganizationsSummary;

export const listenToOrganizationsSummary = (
  onChange: (organizations: Organization[]) => void,
  onError?: (error: Error) => void,
): Unsubscribe =>
  onSnapshot(
    query(organizationsCollection, orderBy('name')),
    (snapshot) => {
      const organizations = snapshot.docs
        .map((docSnapshot) =>
          mapOrganizationSummary(
            docSnapshot.id,
            docSnapshot.data({ serverTimestamps: 'estimate' }),
          ),
        )
        .sort((first, second) => first.name.localeCompare(second.name));

      onChange(organizations);
    },
    (error) => onError?.(error),
  );

const getOrganizationFromServer = async (id: string): Promise<Organization | null> => {
  const organizationRef = doc(firebaseFirestore, ORGANIZATIONS_COLLECTION, id);
  const snapshot = await getDocCacheThenServer(organizationRef);

  if (!snapshot.exists()) {
    return null;
  }

  return mapOrganizationDetail(snapshot.id, snapshot.data({ serverTimestamps: 'estimate' }));
};

export const getOrganizationDetail = async (id: string): Promise<Organization | null> => {
  if (!id) {
    return null;
  }

  const cacheKey = `${ORGANIZATION_DETAIL_CACHE_PREFIX}${id}`;
  return fetchWithCache({
    cache: ORGANIZATION_CACHE,
    key: cacheKey,
    fetcher: () => getOrganizationFromServer(id),
    fallback: null,
    store: (organization) => {
      if (organization) {
        ORGANIZATION_CACHE.set(cacheKey, organization);
      } else {
        ORGANIZATION_CACHE.remove(cacheKey);
      }
    },
  });
};

export const getOrganization = getOrganizationDetail;

export const listenToOrganizationDetail = (
  organizationId: string,
  onChange: (organization: Organization | null) => void,
  onError?: (error: Error) => void,
): Unsubscribe =>
  onSnapshot(
    doc(firebaseFirestore, ORGANIZATIONS_COLLECTION, organizationId),
    async (snapshot) => {
      if (!snapshot.exists()) {
        onChange(null);
        return;
      }

      try {
        const organization = await mapOrganizationDetail(
          snapshot.id,
          snapshot.data({ serverTimestamps: 'estimate' }),
        );
        onChange(organization);
      } catch (error) {
        onError?.(error instanceof Error ? error : new Error('Erro ao carregar organização.'));
      }
    },
    (error) => onError?.(error),
  );

export const createOrganization = async (
  payload: CreateOrganizationPayload,
): Promise<Organization> => {
  const trimmedName = payload.name.trim();
  const trimmedDescription = payload.description.trim();
  const slackWebhookUrl = payload.slackWebhookUrl?.trim() || null;
  const emailDomain = normalizeEmailDomain(payload.emailDomain);
  const browserstackCredentials = normalizeBrowserstackCredentials(payload.browserstackCredentials);
  const additionalEnvironmentTypes = normalizeAdditionalEnvironmentTypes(
    payload.additionalEnvironmentTypes,
  );

  const docRef = await addDoc(organizationsCollection, {
    name: trimmedName,
    description: trimmedDescription,
    logoUrl: null,
    slackWebhookUrl,
    emailDomain,
    additionalEnvironmentTypes,
    browserstackCredentials,
    members: [],
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  const snapshot = await getDocCacheFirst(docRef);
  const organization = await mapOrganizationDetail(
    snapshot.id,
    snapshot.data({ serverTimestamps: 'estimate' }) ?? {},
  );
  ORGANIZATION_CACHE.invalidatePrefix(`${ORGANIZATION_LIST_CACHE_KEY}`);
  ORGANIZATION_CACHE.set(`${ORGANIZATION_DETAIL_CACHE_PREFIX}${organization.id}`, organization);
  return organization;
};

export const updateOrganization = async (
  id: string,
  payload: UpdateOrganizationPayload,
): Promise<Organization> => {
  const organizationRef = doc(firebaseFirestore, ORGANIZATIONS_COLLECTION, id);
  const browserstackCredentials = normalizeBrowserstackCredentials(payload.browserstackCredentials);

  const updatePayload: Record<string, unknown> = {
    name: payload.name.trim(),
    description: payload.description.trim(),
    slackWebhookUrl: payload.slackWebhookUrl?.trim() || null,
    emailDomain: normalizeEmailDomain(payload.emailDomain),
    additionalEnvironmentTypes: normalizeAdditionalEnvironmentTypes(
      payload.additionalEnvironmentTypes,
    ),
    updatedAt: serverTimestamp(),
  };

  if (payload.logoUrl !== undefined) {
    updatePayload.logoUrl = payload.logoUrl;
  }

  if (payload.browserstackCredentials !== undefined) {
    updatePayload.browserstackCredentials = browserstackCredentials;
  }

  await updateDoc(organizationRef, updatePayload);

  const snapshot = await getDocCacheFirst(organizationRef);
  const organization = await mapOrganizationDetail(
    snapshot.id,
    snapshot.data({ serverTimestamps: 'estimate' }) ?? {},
  );
  ORGANIZATION_CACHE.invalidatePrefix(`${ORGANIZATION_LIST_CACHE_KEY}`);
  ORGANIZATION_CACHE.set(`${ORGANIZATION_DETAIL_CACHE_PREFIX}${organization.id}`, organization);
  return organization;
};

export const uploadOrganizationLogo = async (
  organizationId: string,
  file: File,
): Promise<string> => {
  const fileName = buildStorageFileName(file);
  return uploadFileAndGetUrl(`organizations/${organizationId}/logo/${fileName}`, file);
};

export const deleteOrganization = async (id: string): Promise<void> => {
  const organizationRef = doc(firebaseFirestore, ORGANIZATIONS_COLLECTION, id);
  const snapshot = await getDoc(organizationRef);

  if (!snapshot.exists()) {
    throw new Error('Organização não encontrada.');
  }

  const members =
    (snapshot.data({ serverTimestamps: 'estimate' })?.members as string[] | undefined) ?? [];
  const batch = writeBatch(firebaseFirestore);

  members.forEach((memberId) => {
    const userRef = doc(firebaseFirestore, USERS_COLLECTION, memberId);
    batch.set(
      userRef,
      {
        organizationId: null,
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    );
  });

  batch.delete(organizationRef);
  await batch.commit();
  ORGANIZATION_CACHE.invalidatePrefix(`${ORGANIZATION_LIST_CACHE_KEY}`);
  ORGANIZATION_CACHE.remove(`${ORGANIZATION_DETAIL_CACHE_PREFIX}${id}`);
};

export const addUserToOrganization = async (
  payload: AddUserToOrganizationPayload,
): Promise<OrganizationMember> => {
  const normalizedEmail = payload.userEmail.trim().toLowerCase();
  if (!normalizedEmail) {
    throw new Error('Informe um e-mail válido.');
  }

  const usersRef = collection(firebaseFirestore, USERS_COLLECTION);
  const userQuery = query(usersRef, where('email', '==', normalizedEmail), limit(1));
  const userQuerySnapshot = await getDocsCacheFirst(userQuery);

  if (userQuerySnapshot.empty) {
    throw new Error('Usuário não encontrado.');
  }

  const userRef = userQuerySnapshot.docs[0].ref;

  const member = await runTransaction(firebaseFirestore, async (transaction) => {
    const organizationRef = doc(
      firebaseFirestore,
      ORGANIZATIONS_COLLECTION,
      payload.organizationId,
    );
    const organizationSnapshot = await transaction.get(organizationRef);

    if (!organizationSnapshot.exists()) {
      throw new Error('Organização não encontrada.');
    }

    const currentMembers =
      (organizationSnapshot.data({ serverTimestamps: 'estimate' })?.members as
        | string[]
        | undefined) ?? [];

    const userSnapshot = await transaction.get(userRef);
    if (!userSnapshot.exists()) {
      throw new Error('Usuário não encontrado.');
    }

    const userId = userRef.id;
    const userData = userSnapshot.data({ serverTimestamps: 'estimate' }) ?? {};

    const existingOrganizationId = (userData.organizationId as string | null) ?? null;
    if (existingOrganizationId && existingOrganizationId !== payload.organizationId) {
      throw new Error('Usuário já está vinculado a outra organização.');
    }

    if (currentMembers.includes(userId)) {
      throw new Error('Usuário já faz parte da organização.');
    }

    transaction.update(organizationRef, {
      members: [...currentMembers, userId],
      updatedAt: serverTimestamp(),
    });

    const userDocRef = doc(firebaseFirestore, USERS_COLLECTION, userId);
    transaction.set(
      userDocRef,
      {
        organizationId: payload.organizationId,
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    );

    return {
      uid: userId,
      email: (userData.email as string) ?? normalizedEmail,
      displayName: (userData.displayName as string) ?? normalizedEmail,
      photoURL: (userData.photoURL as string | null) ?? null,
    };
  });

  ORGANIZATION_CACHE.invalidatePrefix(`${ORGANIZATION_LIST_CACHE_KEY}`);
  ORGANIZATION_CACHE.remove(`${ORGANIZATION_DETAIL_CACHE_PREFIX}${payload.organizationId}`);

  return member;
};

export const removeUserFromOrganization = async (
  payload: RemoveUserFromOrganizationPayload,
): Promise<void> => {
  const organizationRef = doc(firebaseFirestore, ORGANIZATIONS_COLLECTION, payload.organizationId);
  const userRef = doc(firebaseFirestore, USERS_COLLECTION, payload.userId);

  await runTransaction(firebaseFirestore, async (transaction) => {
    const organizationSnapshot = await transaction.get(organizationRef);

    if (!organizationSnapshot.exists()) {
      throw new Error('Organização não encontrada.');
    }

    const userSnapshot = await transaction.get(userRef);

    if (!userSnapshot.exists()) {
      return;
    }

    const userData = userSnapshot.data({ serverTimestamps: 'estimate' }) ?? {};
    const currentOrganizationId = (userData.organizationId as string | null) ?? null;

    const currentMembers =
      (organizationSnapshot.data({ serverTimestamps: 'estimate' })?.members as
        | string[]
        | undefined) ?? [];

    transaction.update(organizationRef, {
      members: currentMembers.filter((memberId) => memberId !== payload.userId),
      updatedAt: serverTimestamp(),
    });

    if (currentOrganizationId === payload.organizationId) {
      transaction.set(
        userRef,
        {
          organizationId: null,
          updatedAt: serverTimestamp(),
        },
        { merge: true },
      );
    }
  });

  ORGANIZATION_CACHE.invalidatePrefix(`${ORGANIZATION_LIST_CACHE_KEY}`);
  ORGANIZATION_CACHE.remove(`${ORGANIZATION_DETAIL_CACHE_PREFIX}${payload.organizationId}`);
};

export const requestOrganizationAccess = async (
  payload: RequestOrganizationAccessPayload,
): Promise<OrganizationAccessRequest> => {
  const existingPendingRequestsSnapshot = await getDocsCacheThenServer(
    query(
      collectionGroup(firebaseFirestore, ACCESS_REQUESTS_SUBCOLLECTION),
      where('userId', '==', payload.userId),
      limit(50),
    ),
  );

  const hasPendingRequestForAnotherOrganization = existingPendingRequestsSnapshot.docs.some(
    (docSnapshot) => {
      const data = docSnapshot.data({ serverTimestamps: 'estimate' });
      const status = (data.status as string | undefined) ?? '';
      const organizationId = docSnapshot.ref.parent.parent?.id ?? '';

      return status === PENDING_ACCESS_STATUS && organizationId !== payload.organizationId;
    },
  );

  if (hasPendingRequestForAnotherOrganization) {
    throw new Error('Você já possui uma solicitação pendente em outra organização.');
  }

  const organizationRef = doc(firebaseFirestore, ORGANIZATIONS_COLLECTION, payload.organizationId);
  const requestRef = doc(accessRequestsCollection(payload.organizationId), payload.userId);
  const userRef = doc(firebaseFirestore, USERS_COLLECTION, payload.userId);

  await runTransaction(firebaseFirestore, async (transaction) => {
    const [organizationSnapshot, requestSnapshot, userSnapshot] = await Promise.all([
      transaction.get(organizationRef),
      transaction.get(requestRef),
      transaction.get(userRef),
    ]);

    if (!organizationSnapshot.exists()) {
      throw new Error('Organização não encontrada.');
    }

    const currentMembers =
      (organizationSnapshot.data({ serverTimestamps: 'estimate' })?.members as
        | string[]
        | undefined) ?? [];

    if (currentMembers.includes(payload.userId)) {
      throw new Error('Você já faz parte desta organização.');
    }

    const currentOrganizationId =
      (userSnapshot.data({ serverTimestamps: 'estimate' })?.organizationId as string | null) ??
      null;

    if (currentOrganizationId) {
      throw new Error('Seu usuário já está vinculado a uma organização.');
    }

    if (requestSnapshot.exists()) {
      const status =
        (requestSnapshot.data({ serverTimestamps: 'estimate' })?.status as string | undefined) ??
        '';

      if (status === PENDING_ACCESS_STATUS) {
        throw new Error('Sua solicitação já está pendente para esta organização.');
      }
    }

    transaction.set(
      requestRef,
      {
        userId: payload.userId,
        email: payload.userEmail.trim().toLowerCase(),
        displayName: payload.displayName.trim(),
        photoURL: payload.photoURL ?? null,
        status: PENDING_ACCESS_STATUS,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    );
  });

  const snapshot = await getDocCacheThenServer(requestRef);
  return mapAccessRequest(
    payload.organizationId,
    snapshot.id,
    snapshot.data({ serverTimestamps: 'estimate' }) ?? {},
  );
};

export const cancelOrganizationAccessRequest = async (
  payload: CancelOrganizationAccessRequestPayload,
): Promise<void> => {
  const requestRef = doc(accessRequestsCollection(payload.organizationId), payload.userId);
  const snapshot = await getDocCacheThenServer(requestRef);

  if (!snapshot.exists()) {
    return;
  }

  const status =
    (snapshot.data({ serverTimestamps: 'estimate' })?.status as string | undefined) ?? '';

  if (status !== PENDING_ACCESS_STATUS) {
    throw new Error('A solicitação não está mais pendente para cancelamento.');
  }

  await deleteDoc(requestRef);
};

export const approveOrganizationAccessRequest = async (payload: {
  organizationId: string;
  requestId: string;
}): Promise<OrganizationMember> => {
  const organizationRef = doc(firebaseFirestore, ORGANIZATIONS_COLLECTION, payload.organizationId);
  const requestRef = doc(accessRequestsCollection(payload.organizationId), payload.requestId);

  const member = await runTransaction(firebaseFirestore, async (transaction) => {
    const [organizationSnapshot, requestSnapshot] = await Promise.all([
      transaction.get(organizationRef),
      transaction.get(requestRef),
    ]);

    if (!organizationSnapshot.exists()) {
      throw new Error('Organização não encontrada.');
    }

    if (!requestSnapshot.exists()) {
      throw new Error('Solicitação não encontrada.');
    }

    const requestData = requestSnapshot.data({ serverTimestamps: 'estimate' }) ?? {};
    const userId = ((requestData.userId as string) ?? payload.requestId).trim();

    if (!userId) {
      throw new Error('Solicitação inválida.');
    }

    const userRef = doc(firebaseFirestore, USERS_COLLECTION, userId);
    const userSnapshot = await transaction.get(userRef);
    if (!userSnapshot.exists()) {
      throw new Error('Usuário não encontrado.');
    }

    const organizationData = organizationSnapshot.data({ serverTimestamps: 'estimate' }) ?? {};
    const currentMembers = ((organizationData.members as string[] | undefined) ?? []).filter(
      Boolean,
    );
    const userData = userSnapshot.data({ serverTimestamps: 'estimate' }) ?? {};
    const currentOrganizationId = (userData.organizationId as string | null) ?? null;

    if (currentOrganizationId && currentOrganizationId !== payload.organizationId) {
      throw new Error('Usuário já está vinculado a outra organização.');
    }

    const nextMembers = currentMembers.includes(userId)
      ? currentMembers
      : [...currentMembers, userId];

    transaction.update(organizationRef, {
      members: nextMembers,
      updatedAt: serverTimestamp(),
    });
    transaction.set(
      userRef,
      {
        organizationId: payload.organizationId,
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    );
    transaction.delete(requestRef);

    return {
      uid: userId,
      email: (userData.email as string) ?? (requestData.email as string) ?? '',
      displayName:
        (userData.displayName as string) ??
        (requestData.displayName as string) ??
        (requestData.email as string) ??
        '',
      photoURL:
        (userData.photoURL as string | null) ??
        (requestData.photoURL as string | null | undefined) ??
        null,
    };
  });

  ORGANIZATION_CACHE.invalidatePrefix(`${ORGANIZATION_LIST_CACHE_KEY}`);
  ORGANIZATION_CACHE.remove(`${ORGANIZATION_DETAIL_CACHE_PREFIX}${payload.organizationId}`);
  return member;
};

export const getUserOrganization = async (userId: string): Promise<Organization | null> => {
  const userRef = doc(firebaseFirestore, USERS_COLLECTION, userId);
  try {
    const userSnapshot = await getDocCacheThenServer(userRef);

    if (!userSnapshot.exists()) {
      return null;
    }

    const organizationId =
      (userSnapshot.data({ serverTimestamps: 'estimate' })?.organizationId as string | null) ??
      null;
    if (!organizationId) {
      return null;
    }

    return getOrganizationDetail(organizationId);
  } catch (error) {
    console.error(error);
    return null;
  }
};

export const listenToPendingAccessRequestsByUser = (
  userId: string,
  onChange: (requests: OrganizationAccessRequest[]) => void,
  onError?: (error: Error) => void,
): Unsubscribe =>
  onSnapshot(
    query(
      collectionGroup(firebaseFirestore, ACCESS_REQUESTS_SUBCOLLECTION),
      where('userId', '==', userId),
    ),
    (snapshot) => {
      const requests = snapshot.docs
        .map((docSnapshot) => {
          const data = docSnapshot.data({ serverTimestamps: 'estimate' });
          if ((data.status as string | undefined) !== PENDING_ACCESS_STATUS) {
            return null;
          }
          const organizationId = docSnapshot.ref.parent.parent?.id ?? '';
          return mapAccessRequest(organizationId, docSnapshot.id, data);
        })
        .filter((request): request is OrganizationAccessRequest =>
          Boolean(request?.organizationId),
        );

      onChange(
        requests.sort(
          (first, second) => (second.createdAt?.getTime() ?? 0) - (first.createdAt?.getTime() ?? 0),
        ),
      );
    },
    (error) => onError?.(error),
  );

export const listenToPendingAccessRequestsForOrganization = (
  organizationId: string,
  onChange: (requests: OrganizationAccessRequest[]) => void,
  onError?: (error: Error) => void,
): Unsubscribe =>
  onSnapshot(
    query(accessRequestsCollection(organizationId), where('status', '==', PENDING_ACCESS_STATUS)),
    (snapshot) => {
      const requests = snapshot.docs
        .map((docSnapshot) =>
          mapAccessRequest(
            organizationId,
            docSnapshot.id,
            docSnapshot.data({ serverTimestamps: 'estimate' }),
          ),
        )
        .sort(
          (first, second) => (second.createdAt?.getTime() ?? 0) - (first.createdAt?.getTime() ?? 0),
        );
      onChange(requests);
    },
    (error) => onError?.(error),
  );

export const listenToAllPendingAccessRequests = (
  onChange: (requests: OrganizationAccessRequest[]) => void,
  onError?: (error: Error) => void,
): Unsubscribe =>
  onSnapshot(
    query(collectionGroup(firebaseFirestore, ACCESS_REQUESTS_SUBCOLLECTION)),
    (snapshot) => {
      const requests = snapshot.docs
        .map((docSnapshot) => {
          const data = docSnapshot.data({ serverTimestamps: 'estimate' });
          if ((data.status as string | undefined) !== PENDING_ACCESS_STATUS) {
            return null;
          }
          const organizationId = docSnapshot.ref.parent.parent?.id ?? '';
          return mapAccessRequest(organizationId, docSnapshot.id, data);
        })
        .filter((request): request is OrganizationAccessRequest => Boolean(request?.organizationId))
        .sort(
          (first, second) => (second.createdAt?.getTime() ?? 0) - (first.createdAt?.getTime() ?? 0),
        );

      onChange(requests);
    },
    (error) => onError?.(error),
  );

export const findOrganizationByEmailDomain = async (
  email: string,
): Promise<Organization | null> => {
  const normalizedDomain = getNormalizedEmailDomain(email);

  if (!normalizedDomain) {
    return null;
  }

  try {
    const organizationQuery = query(
      organizationsCollection,
      where('emailDomain', '==', normalizedDomain),
      limit(1),
    );
    const snapshot = await getDocsCacheFirst(organizationQuery);

    if (snapshot.empty) {
      return null;
    }

    const organizationDoc = snapshot.docs[0];
    return mapOrganizationSummary(
      organizationDoc.id,
      organizationDoc.data({ serverTimestamps: 'estimate' }),
    );
  } catch (error) {
    console.error(error);
    return null;
  }
};

export const addUserToOrganizationByEmailDomain = async (
  user: Pick<OrganizationMember, 'uid' | 'email' | 'displayName' | 'photoURL'>,
): Promise<string | null> => {
  const organization = await findOrganizationByEmailDomain(user.email);

  if (!organization) {
    return null;
  }

  const organizationRef = doc(firebaseFirestore, ORGANIZATIONS_COLLECTION, organization.id);
  const userRef = doc(firebaseFirestore, USERS_COLLECTION, user.uid);

  let assignedOrganizationId: string | null = null;
  await runTransaction(firebaseFirestore, async (transaction) => {
    const organizationSnapshot = await transaction.get(organizationRef);

    if (!organizationSnapshot.exists()) {
      assignedOrganizationId = null;
      return;
    }

    const currentMembers =
      (organizationSnapshot.data({ serverTimestamps: 'estimate' })?.members as
        | string[]
        | undefined) ?? [];
    const userSnapshot = await transaction.get(userRef);
    const existingOrganizationId =
      (userSnapshot.data({ serverTimestamps: 'estimate' })?.organizationId as string | null) ??
      null;

    if (existingOrganizationId && existingOrganizationId !== organization.id) {
      assignedOrganizationId = existingOrganizationId;
      return;
    }

    const shouldAddMember = !currentMembers.includes(user.uid);
    const resolvedOrganizationId = existingOrganizationId ?? organization.id;

    if (shouldAddMember) {
      transaction.update(organizationRef, {
        members: [...currentMembers, user.uid],
        updatedAt: serverTimestamp(),
      });
    }

    transaction.set(
      userRef,
      {
        organizationId: resolvedOrganizationId,
        email: user.email,
        displayName: user.displayName,
        photoURL: user.photoURL,
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    );

    assignedOrganizationId = resolvedOrganizationId;
  });

  return assignedOrganizationId;
};

const mapOrganizationSummary = (
  id: string,
  data: Record<string, unknown> | undefined,
): Organization => {
  const memberIds = (data?.members as string[] | undefined) ?? [];
  const members: OrganizationMember[] = [];
  const browserstackCredentials = normalizeBrowserstackCredentials(
    (data?.browserstackCredentials as BrowserstackCredentials | null | undefined) ?? null,
  );
  const additionalEnvironmentTypes = normalizeAdditionalEnvironmentTypes(
    data?.additionalEnvironmentTypes,
  );

  return {
    id,
    name: ((data?.name as string) ?? '').trim(),
    description: ((data?.description as string) ?? '').trim(),
    logoUrl: ((data?.logoUrl as string) ?? '').trim() || null,
    slackWebhookUrl: ((data?.slackWebhookUrl as string) ?? '').trim() || null,
    emailDomain: normalizeEmailDomain((data?.emailDomain as string | null | undefined) ?? null),
    additionalEnvironmentTypes,
    browserstackCredentials,
    members,
    memberIds,
    pendingAccessRequests: [],
    createdAt: timestampToDate(data?.createdAt),
    updatedAt: timestampToDate(data?.updatedAt),
  };
};

const mapOrganizationDetail = async (
  id: string,
  data: Record<string, unknown> | undefined,
): Promise<Organization> => {
  const memberIds = (data?.members as string[] | undefined) ?? [];
  const [members, pendingAccessRequests] = await Promise.all([
    fetchMembers(memberIds),
    listPendingAccessRequests(id),
  ]);
  const browserstackCredentials = normalizeBrowserstackCredentials(
    (data?.browserstackCredentials as BrowserstackCredentials | null | undefined) ?? null,
  );
  const additionalEnvironmentTypes = normalizeAdditionalEnvironmentTypes(
    data?.additionalEnvironmentTypes,
  );

  return {
    id,
    name: ((data?.name as string) ?? '').trim(),
    description: ((data?.description as string) ?? '').trim(),
    logoUrl: ((data?.logoUrl as string) ?? '').trim() || null,
    slackWebhookUrl: ((data?.slackWebhookUrl as string) ?? '').trim() || null,
    emailDomain: normalizeEmailDomain((data?.emailDomain as string | null | undefined) ?? null),
    additionalEnvironmentTypes,
    browserstackCredentials,
    members,
    memberIds,
    pendingAccessRequests,
    createdAt: timestampToDate(data?.createdAt),
    updatedAt: timestampToDate(data?.updatedAt),
  };
};

const timestampToDate = (value: unknown): Date | null => {
  if (value instanceof Timestamp) {
    return value.toDate();
  }

  return null;
};

const fetchMembers = async (memberIds: string[]): Promise<OrganizationMember[]> => {
  if (memberIds.length === 0) {
    return [];
  }

  const uniqueIds = Array.from(new Set(memberIds)).filter((id) => id.length > 0);
  const usersRef = collection(firebaseFirestore, USERS_COLLECTION);
  const chunks = chunkArray(uniqueIds, 10);
  const snapshots = await Promise.all(
    chunks.map((chunk) =>
      getDocsCacheThenServer(query(usersRef, where(documentId(), 'in', chunk))),
    ),
  );

  const memberMap = new Map<string, OrganizationMember>();
  snapshots.forEach((snapshot) => {
    snapshot.forEach((docSnapshot) => {
      const data = docSnapshot.data({ serverTimestamps: 'estimate' });
      memberMap.set(docSnapshot.id, {
        uid: docSnapshot.id,
        email: (data.email as string) ?? '',
        displayName: (data.displayName as string) ?? '',
        photoURL: (data.photoURL as string | null) ?? null,
      });
    });
  });

  return memberIds
    .map((id) => memberMap.get(id))
    .filter((member): member is OrganizationMember => Boolean(member));
};

const chunkArray = <T>(items: T[], size: number): T[][] => {
  if (items.length === 0) {
    return [];
  }

  return items.reduce<T[][]>((acc, item, index) => {
    const chunkIndex = Math.floor(index / size);
    if (!acc[chunkIndex]) {
      acc[chunkIndex] = [];
    }
    acc[chunkIndex].push(item);
    return acc;
  }, []);
};
