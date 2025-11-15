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
  writeBatch
} from 'firebase/firestore';

import type { Organization, OrganizationMember } from '../../domain/entities/Organization';
import type {
  AddUserToOrganizationPayload,
  CreateOrganizationPayload,
  IOrganizationRepository,
  RemoveUserFromOrganizationPayload,
  UpdateOrganizationPayload
} from '../../domain/repositories/OrganizationRepository';
import { firebaseFirestore } from '../firebase/firebaseConfig';

const ORGANIZATIONS_COLLECTION = 'organizations';
const USERS_COLLECTION = 'users';

export class FirebaseOrganizationRepository implements IOrganizationRepository {
  private readonly organizationsCollection = collection(firebaseFirestore, ORGANIZATIONS_COLLECTION);

  async list(): Promise<Organization[]> {
    const snapshot = await getDocs(this.organizationsCollection);
    const organizations = await Promise.all(
      snapshot.docs.map((docSnapshot) => this.mapOrganization(docSnapshot.id, docSnapshot.data()))
    );

    return organizations.sort((a, b) => a.name.localeCompare(b.name));
  }

  async getById(id: string): Promise<Organization | null> {
    const organizationRef = doc(firebaseFirestore, ORGANIZATIONS_COLLECTION, id);
    const snapshot = await getDoc(organizationRef);

    if (!snapshot.exists()) {
      return null;
    }

    return this.mapOrganization(snapshot.id, snapshot.data());
  }

  async create(payload: CreateOrganizationPayload): Promise<Organization> {
    const trimmedName = payload.name.trim();
    const trimmedDescription = payload.description.trim();

    const docRef = await addDoc(this.organizationsCollection, {
      name: trimmedName,
      description: trimmedDescription,
      members: [],
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });

    const snapshot = await getDoc(docRef);
    return this.mapOrganization(snapshot.id, snapshot.data() ?? {});
  }

  async update(id: string, payload: UpdateOrganizationPayload): Promise<Organization> {
    const organizationRef = doc(firebaseFirestore, ORGANIZATIONS_COLLECTION, id);

    await updateDoc(organizationRef, {
      name: payload.name.trim(),
      description: payload.description.trim(),
      updatedAt: serverTimestamp()
    });

    const snapshot = await getDoc(organizationRef);
    return this.mapOrganization(snapshot.id, snapshot.data() ?? {});
  }

  async delete(id: string): Promise<void> {
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
          updatedAt: serverTimestamp()
        },
        { merge: true }
      );
    });

    batch.delete(organizationRef);
    await batch.commit();
  }

  async addUserByEmail(payload: AddUserToOrganizationPayload): Promise<OrganizationMember> {
    const normalizedEmail = payload.userEmail.trim().toLowerCase();
    if (!normalizedEmail) {
      throw new Error('Informe um e-mail válido.');
    }

    return runTransaction(firebaseFirestore, async (transaction) => {
      const organizationRef = doc(firebaseFirestore, ORGANIZATIONS_COLLECTION, payload.organizationId);
      const organizationSnapshot = await transaction.get(organizationRef);

      if (!organizationSnapshot.exists()) {
        throw new Error('Organização não encontrada.');
      }

      const currentMembers = (organizationSnapshot.data()?.members as string[] | undefined) ?? [];

      const usersRef = collection(firebaseFirestore, USERS_COLLECTION);
      const userQuery = query(usersRef, where('email', '==', normalizedEmail), limit(1));
      const userSnapshot = await getDocs(userQuery);

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
        updatedAt: serverTimestamp()
      });

      const userRef = doc(firebaseFirestore, USERS_COLLECTION, userId);
      transaction.set(
        userRef,
        {
          organizationId: payload.organizationId,
          updatedAt: serverTimestamp()
        },
        { merge: true }
      );

      return {
        uid: userId,
        email: (userData.email as string) ?? normalizedEmail,
        displayName: (userData.displayName as string) ?? normalizedEmail,
        photoURL: (userData.photoURL as string | null) ?? null
      };
    });
  }

  async removeUser(payload: RemoveUserFromOrganizationPayload): Promise<void> {
    const organizationRef = doc(firebaseFirestore, ORGANIZATIONS_COLLECTION, payload.organizationId);
    const userRef = doc(firebaseFirestore, USERS_COLLECTION, payload.userId);

    await runTransaction(firebaseFirestore, async (transaction) => {
      const organizationSnapshot = await transaction.get(organizationRef);

      if (!organizationSnapshot.exists()) {
        throw new Error('Organização não encontrada.');
      }

      transaction.update(organizationRef, {
        members: arrayRemove(payload.userId),
        updatedAt: serverTimestamp()
      });

      const userSnapshot = await transaction.get(userRef);
      if (userSnapshot.exists()) {
        const userData = userSnapshot.data();
        const currentOrganizationId = (userData.organizationId as string | null) ?? null;

        if (currentOrganizationId === payload.organizationId) {
          transaction.set(
            userRef,
            {
              organizationId: null,
              updatedAt: serverTimestamp()
            },
            { merge: true }
          );
        }
      }
    });
  }

  async getUserOrganization(userId: string): Promise<Organization | null> {
    const userRef = doc(firebaseFirestore, USERS_COLLECTION, userId);
    const userSnapshot = await getDoc(userRef);

    if (!userSnapshot.exists()) {
      return null;
    }

    const organizationId = (userSnapshot.data()?.organizationId as string | null) ?? null;
    if (!organizationId) {
      return null;
    }

    return this.getById(organizationId);
  }

  private async mapOrganization(
    id: string,
    data: Record<string, unknown> | undefined
  ): Promise<Organization> {
    const memberIds = (data?.members as string[] | undefined) ?? [];
    const members = await this.fetchMembers(memberIds);

    return {
      id,
      name: ((data?.name as string) ?? '').trim(),
      description: ((data?.description as string) ?? '').trim(),
      members,
      memberIds,
      createdAt: this.timestampToDate(data?.createdAt),
      updatedAt: this.timestampToDate(data?.updatedAt)
    };
  }

  private timestampToDate(value: unknown): Date | null {
    if (value instanceof Timestamp) {
      return value.toDate();
    }

    return null;
  }

  private async fetchMembers(memberIds: string[]): Promise<OrganizationMember[]> {
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
          photoURL: (data.photoURL as string | null) ?? null
        };
      })
    );

    return members.filter((member): member is OrganizationMember => Boolean(member));
  }
}
