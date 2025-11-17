import { doc, getDoc } from 'firebase/firestore';

import type { UserSummary } from '../../domain/entities/UserSummary';
import type { IUserRepository } from '../../domain/repositories/UserRepository';
import { firebaseFirestore } from '../firebase/firebaseConfig';

const USERS_COLLECTION = 'users';
const DEFAULT_DISPLAY_NAME = 'Usuário';

export class FirebaseUserRepository implements IUserRepository {
  async getSummariesByIds(userIds: string[]): Promise<UserSummary[]> {
    if (userIds.length === 0) {
      return [];
    }

    const profiles = await Promise.all(userIds.map((userId) => this.fetchUserSummary(userId)));
    return profiles.filter((profile): profile is UserSummary => Boolean(profile));
  }

  private async fetchUserSummary(userId: string): Promise<UserSummary | null> {
    if (!userId) {
      return null;
    }

    const userRef = doc(firebaseFirestore, USERS_COLLECTION, userId);
    const snapshot = await getDoc(userRef);

    const data = snapshot.data();
    const email = typeof data?.email === 'string' ? data.email : '';
    const displayName = this.resolveDisplayName(data?.displayName, email);
    const photoURL = typeof data?.photoURL === 'string' ? data.photoURL : null;

    return {
      id: userId,
      email,
      displayName,
      photoURL,
    };
  }

  private resolveDisplayName(rawDisplayName: unknown, email: string): string {
    const normalizedName = typeof rawDisplayName === 'string' ? rawDisplayName.trim() : '';

    if (normalizedName) {
      return normalizedName;
    }

    if (email) {
      return email;
    }

    return DEFAULT_DISPLAY_NAME;
  }
}
