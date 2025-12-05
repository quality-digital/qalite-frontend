import { collection, doc, getDoc, getDocs, limit } from 'firebase/firestore';

import type { UserSummary } from '../../domain/entities/user';
import { firebaseFirestore } from '../database/firebase';

const USERS_COLLECTION = 'users';
const DEFAULT_DISPLAY_NAME = 'Usuário';
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

  const usersRef = collection(firebaseFirestore, USERS_COLLECTION);
  const snapshot = await getDocs(limit(usersRef, 100));

  const matches: UserSummary[] = [];

  snapshot.forEach((userDoc) => {
    const data = userDoc.data();
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
};

const fetchUserSummary = async (userId: string): Promise<UserSummary | null> => {
  if (!userId) {
    return null;
  }

  const userRef = doc(firebaseFirestore, USERS_COLLECTION, userId);
  const snapshot = await getDoc(userRef);

  const data = snapshot.data();
  const email = typeof data?.email === 'string' ? data.email : '';
  const displayName = resolveDisplayName(data?.displayName, email);
  const photoURL = typeof data?.photoURL === 'string' ? data.photoURL : null;

  return {
    id: userId,
    email,
    displayName,
    photoURL,
  };
};

const resolveDisplayName = (rawDisplayName: unknown, email: string): string => {
  const normalizedName = typeof rawDisplayName === 'string' ? rawDisplayName.trim() : '';

  if (normalizedName) {
    return normalizedName;
  }

  if (email) {
    return email;
  }

  return DEFAULT_DISPLAY_NAME;
};
