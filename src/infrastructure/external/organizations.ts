import {
  Timestamp,
  addDoc,
  arrayRemove,
  arrayUnion,
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  query,
  runTransaction,
  serverTimestamp,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';

import type { Organization, OrganizationMember } from '../../domain/entities/organization';
import { getNormalizedEmailDomain, normalizeEmailDomain } from '../../shared/utils/email';
import { firebaseFirestore, firebaseStorage } from '../database/firebase';
import { logActivity } from './logs';

const ORGANIZATIONS_COLLECTION = 'organizations';
const USERS_COLLECTION = 'users';

export interface CreateOrganizationPayload {
  name: string;
  description: string;
  logoFile?: File | null;
  slackWebhookUrl?: string | null;
  emailDomain?: string | null;
}

export interface UpdateOrganizationPayload {
  name: string;
  description: string;
  logoFile?: File | null;
  slackWebhookUrl?: string | null;
  emailDomain?: string | null;
}

export interface AddUserToOrganizationPayload {
  organizationId: string;
  userEmail: string;
}

export interface RemoveUserFromOrganizationPayload {
  organizationId: string;
  userId: string;
}

const organizationsCollection = collection(firebaseFirestore, ORGANIZATIONS_COLLECTION);

export const listOrganizations = async (): Promise<Organization[]> => {
  const snapshot = await getDocs(organizationsCollection);
  const organizations = await Promise.all(
    snapshot.docs.map((docSnapshot) => mapOrganization(docSnapshot.id, docSnapshot.data())),
  );

  return organizations.sort((a, b) => a.name.localeCompare(b.name));
};

export const getOrganization = async (id: string): Promise<Organization | null> => {
  const organizationRef = doc(firebaseFirestore, ORGANIZATIONS_COLLECTION, id);
  const snapshot = await getDoc(organizationRef);

  if (!snapshot.exists()) {
    return null;
  }

  return mapOrganization(snapshot.id, snapshot.data());
};

export const createOrganization = async (
  payload: CreateOrganizationPayload,
): Promise<Organization> => {
  const trimmedName = payload.name.trim();
  const trimmedDescription = payload.description.trim();
  const slackWebhookUrl = payload.slackWebhookUrl?.trim() || null;
  const emailDomain = normalizeEmailDomain(payload.emailDomain);

  const docRef = await addDoc(organizationsCollection, {
    name: trimmedName,
    description: trimmedDescription,
    logoUrl: null,
    slackWebhookUrl,
    emailDomain,
    members: [],
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  if (payload.logoFile) {
    const logoUrl = await uploadOrganizationLogo(docRef.id, payload.logoFile);
    await updateDoc(docRef, {
      logoUrl,
      updatedAt: serverTimestamp(),
    });
  }

  await logActivity({
    organizationId: docRef.id,
    entityId: docRef.id,
    entityType: 'organization',
    action: 'create',
    message: `Organização criada: ${trimmedName}`,
  });

  const snapshot = await getDoc(docRef);
  return mapOrganization(snapshot.id, snapshot.data() ?? {});
};

export const updateOrganization = async (
  id: string,
  payload: UpdateOrganizationPayload,
): Promise<Organization> => {
  const organizationRef = doc(firebaseFirestore, ORGANIZATIONS_COLLECTION, id);

  const updatePayload: Record<string, unknown> = {
    name: payload.name.trim(),
    description: payload.description.trim(),
    slackWebhookUrl: payload.slackWebhookUrl?.trim() || null,
    emailDomain: normalizeEmailDomain(payload.emailDomain),
    updatedAt: serverTimestamp(),
  };

  if (payload.logoFile) {
    const logoUrl = await uploadOrganizationLogo(id, payload.logoFile);
    updatePayload.logoUrl = logoUrl;
  }

  await updateDoc(organizationRef, updatePayload);

  await logActivity({
    organizationId: id,
    entityId: id,
    entityType: 'organization',
    action: 'update',
    message: `Organização atualizada: ${updatePayload.name}`,
  });

  const snapshot = await getDoc(organizationRef);
  return mapOrganization(snapshot.id, snapshot.data() ?? {});
};

export const deleteOrganization = async (id: string): Promise<void> => {
  const organizationRef = doc(firebaseFirestore, ORGANIZATIONS_COLLECTION, id);
  const snapshot = await getDoc(organizationRef);

  if (!snapshot.exists()) {
    throw new Error('Organização não encontrada.');
  }

  const members = (snapshot.data()?.members as string[] | undefined) ?? [];
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

  await logActivity({
    organizationId: id,
    entityId: id,
    entityType: 'organization',
    action: 'delete',
    message: `Organização removida: ${(snapshot.data()?.name as string | undefined) ?? id}`,
  });
};

export const addUserToOrganization = async (
  payload: AddUserToOrganizationPayload,
): Promise<OrganizationMember> => {
  const normalizedEmail = payload.userEmail.trim().toLowerCase();
  if (!normalizedEmail) {
    throw new Error('Informe um e-mail válido.');
  }

  let organizationName = '';

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

    organizationName = (organizationSnapshot.data()?.name as string | undefined) ?? '';

    const currentMembers = (organizationSnapshot.data()?.members as string[] | undefined) ?? [];

    const usersRef = collection(firebaseFirestore, USERS_COLLECTION);
    const userQuery = query(usersRef, where('email', '==', normalizedEmail), limit(1));
    const userSnapshot = await transaction.get(userQuery);

    if (userSnapshot.empty) {
      throw new Error('Usuário não encontrado.');
    }

    const userDoc = userSnapshot.docs[0];
    const userId = userDoc.id;
    const userData = userDoc.data();

    const existingOrganizationId = (userData.organizationId as string | null) ?? null;
    if (existingOrganizationId && existingOrganizationId !== payload.organizationId) {
      throw new Error('Usuário já está vinculado a outra organização.');
    }

    if (currentMembers.includes(userId)) {
      throw new Error('Usuário já faz parte da organização.');
    }

    transaction.update(organizationRef, {
      members: arrayUnion(userId),
      updatedAt: serverTimestamp(),
    });

    const userRef = doc(firebaseFirestore, USERS_COLLECTION, userId);
    transaction.set(
      userRef,
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

  await logActivity({
    organizationId: payload.organizationId,
    entityId: payload.organizationId,
    entityType: 'organization',
    action: 'participation',
    message: `Membro adicionado: ${member.displayName || member.email} em ${organizationName || 'organização'}`,
  });

  return member;
};

export const removeUserFromOrganization = async (
  payload: RemoveUserFromOrganizationPayload,
): Promise<void> => {
  const organizationRef = doc(firebaseFirestore, ORGANIZATIONS_COLLECTION, payload.organizationId);
  const userRef = doc(firebaseFirestore, USERS_COLLECTION, payload.userId);

  let organizationName = '';
  let removedUserLabel: string | null = null;

  await runTransaction(firebaseFirestore, async (transaction) => {
    const organizationSnapshot = await transaction.get(organizationRef);

    if (!organizationSnapshot.exists()) {
      throw new Error('Organização não encontrada.');
    }

    organizationName = (organizationSnapshot.data()?.name as string | undefined) ?? '';

    const userSnapshot = await transaction.get(userRef);

    if (!userSnapshot.exists()) {
      return;
    }

    const userData = userSnapshot.data();
    const currentOrganizationId = (userData.organizationId as string | null) ?? null;

    removedUserLabel = (userData.displayName as string | undefined) ?? userData.email;

    transaction.update(organizationRef, {
      members: arrayRemove(payload.userId),
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

  await logActivity({
    organizationId: payload.organizationId,
    entityId: payload.organizationId,
    entityType: 'organization',
    action: 'participation',
    message: `Membro removido: ${removedUserLabel ?? payload.userId} de ${organizationName || 'organização'}`,
  });
};

export const getUserOrganization = async (userId: string): Promise<Organization | null> => {
  const userRef = doc(firebaseFirestore, USERS_COLLECTION, userId);
  const userSnapshot = await getDoc(userRef);

  if (!userSnapshot.exists()) {
    return null;
  }

  const organizationId = (userSnapshot.data()?.organizationId as string | null) ?? null;
  if (!organizationId) {
    return null;
  }

  return getOrganization(organizationId);
};

export const findOrganizationByEmailDomain = async (
  email: string,
): Promise<Organization | null> => {
  const normalizedDomain = getNormalizedEmailDomain(email);

  if (!normalizedDomain) {
    return null;
  }

  const organizationQuery = query(
    organizationsCollection,
    where('emailDomain', '==', normalizedDomain),
    limit(1),
  );
  const snapshot = await getDocs(organizationQuery);

  if (snapshot.empty) {
    return null;
  }

  const organizationDoc = snapshot.docs[0];
  return mapOrganization(organizationDoc.id, organizationDoc.data());
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
  let addedToOrganization = false;

  await runTransaction(firebaseFirestore, async (transaction) => {
    const organizationSnapshot = await transaction.get(organizationRef);

    if (!organizationSnapshot.exists()) {
      assignedOrganizationId = null;
      return;
    }

    const currentMembers = (organizationSnapshot.data()?.members as string[] | undefined) ?? [];
    const userSnapshot = await transaction.get(userRef);
    const existingOrganizationId = (userSnapshot.data()?.organizationId as string | null) ?? null;

    if (existingOrganizationId && existingOrganizationId !== organization.id) {
      assignedOrganizationId = existingOrganizationId;
      return;
    }

    const shouldAddMember = !currentMembers.includes(user.uid);
    const resolvedOrganizationId = existingOrganizationId ?? organization.id;

    if (shouldAddMember) {
      transaction.update(organizationRef, {
        members: arrayUnion(user.uid),
        updatedAt: serverTimestamp(),
      });
      addedToOrganization = true;
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

  if (addedToOrganization) {
    await logActivity({
      organizationId: organization.id,
      entityId: organization.id,
      entityType: 'organization',
      action: 'participation',
      message: `Membro adicionado automaticamente: ${user.displayName || user.email}`,
    });
  }

  return assignedOrganizationId;
};

const mapOrganization = async (
  id: string,
  data: Record<string, unknown> | undefined,
): Promise<Organization> => {
  const memberIds = (data?.members as string[] | undefined) ?? [];
  const members = await fetchMembers(memberIds);

  return {
    id,
    name: ((data?.name as string) ?? '').trim(),
    description: ((data?.description as string) ?? '').trim(),
    logoUrl: ((data?.logoUrl as string) ?? '').trim() || null,
    slackWebhookUrl: ((data?.slackWebhookUrl as string) ?? '').trim() || null,
    emailDomain: normalizeEmailDomain((data?.emailDomain as string | null | undefined) ?? null),
    members,
    memberIds,
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

  const members = await Promise.all(
    memberIds.map(async (uid) => {
      const userRef = doc(firebaseFirestore, USERS_COLLECTION, uid);
      const snapshot = await getDoc(userRef);

      if (!snapshot.exists()) {
        return null;
      }

      const data = snapshot.data();
      return {
        uid,
        email: (data.email as string) ?? '',
        displayName: (data.displayName as string) ?? '',
        photoURL: (data.photoURL as string | null) ?? null,
      };
    }),
  );

  return members.filter((member): member is OrganizationMember => Boolean(member));
};

const uploadOrganizationLogo = async (organizationId: string, file: File): Promise<string> => {
  const extension = file.name.split('.').pop();
  const sanitizedExtension = extension ? extension.toLowerCase().replace(/[^a-z0-9]/g, '') : '';
  const fileName = sanitizedExtension ? `logo.${sanitizedExtension}` : 'logo';
  const storageRef = ref(
    firebaseStorage,
    `${ORGANIZATIONS_COLLECTION}/${organizationId}/${fileName}`,
  );
  await uploadBytes(storageRef, file);
  return getDownloadURL(storageRef);
};
