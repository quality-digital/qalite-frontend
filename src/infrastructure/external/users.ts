import { collection, doc, limit, query } from 'firebase/firestore';

import i18n from '../../lib/i18n';
import type { UserSummary } from '../../domain/entities/user';
import { firebaseFirestore } from '../database/firebase';
import { getDocCacheFirst, getDocsCacheThenServer } from './firestoreCache';

const USERS_COLLECTION = 'users';
const DEFAULT_DISPLAY_NAME = 'generic.user';
const MAX_SUGGESTION_RESULTS = 15;

export const getUserSummariesByIds = async (userIds: string[]): Promise<UserSummary[]> => {
  if (userIds.length === 0) {
    return [];
  }

  const profiles = await Promise.all(userIds.map((userId) => fetchUserSummary(userId)));
  return profiles.filter((profile): profile is UserSummary => Boolean(profile));
};

export const searchUsersByTerm = async (term: string): Promise<UserSummary[]> => {
  const normalizedTerm = term.trim().toLowerCase();

  if (!normalizedTerm) {
    return [];
  }

  try {
    const usersRef = collection(firebaseFirestore, USERS_COLLECTION);
    const snapshot = await getDocsCacheThenServer(query(usersRef, limit(100)));

    const matches: UserSummary[] = [];

    snapshot.forEach((userDoc) => {
      const data = userDoc.data({ serverTimestamps: 'estimate' });
      const email = typeof data?.email === 'string' ? data.email : '';
      const displayName = resolveDisplayName(data?.displayName, email);
      const photoURL = typeof data?.photoURL === 'string' ? data.photoURL : null;

      const searchableEmail = email.toLowerCase();
      const searchableName = displayName.toLowerCase();

      if (searchableEmail.includes(normalizedTerm) || searchableName.includes(normalizedTerm)) {
        matches.push({ id: userDoc.id, email, displayName, photoURL });
      }
    });

    return matches.slice(0, MAX_SUGGESTION_RESULTS);
  } catch (error) {
    console.error(error);
    return [];
  }
};

const fetchUserSummary = async (userId: string): Promise<UserSummary | null> => {
  if (!userId) {
    return null;
  }

  try {
    const userRef = doc(firebaseFirestore, USERS_COLLECTION, userId);
    const snapshot = await getDocCacheFirst(userRef);

    if (!snapshot.exists()) {
      return null;
    }

    const data = snapshot.data({ serverTimestamps: 'estimate' });
    const email = typeof data?.email === 'string' ? data.email : '';
    const displayName = resolveDisplayName(data?.displayName, email);
    const photoURL = typeof data?.photoURL === 'string' ? data.photoURL : null;

    return {
      id: userId,
      email,
      displayName,
      photoURL,
    };
  } catch (error) {
    console.error(error);
    return null;
  }
};

const resolveDisplayName = (rawDisplayName: unknown, email: string): string => {
  const normalizedName = typeof rawDisplayName === 'string' ? rawDisplayName.trim() : '';

  if (normalizedName) {
    return normalizedName;
  }

  if (email) {
    return email;
  }

  return i18n.t(DEFAULT_DISPLAY_NAME);
};
