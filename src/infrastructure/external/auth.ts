import {
  User as FirebaseUser,
  createUserWithEmailAndPassword,
  onAuthStateChanged as firebaseOnAuthStateChanged,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
  updateProfile as firebaseUpdateProfile,
} from 'firebase/auth';
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';

import type {
  AuthStateListener,
  AuthUser,
  LoginPayload,
  RegisterPayload,
  Role,
  UpdateProfilePayload,
} from '../../domain/entities/auth';
import type { BrowserstackCredentials } from '../../domain/entities/browserstack';
import { DEFAULT_ROLE } from '../../domain/entities/auth';
import { addUserToOrganizationByEmailDomain } from './organizations';
import { firebaseAuth, firebaseFirestore } from '../database/firebase';

const USERS_COLLECTION = 'users';
const AUTH_COOKIE_NAME = 'firebase:authUser';

const persistFirebaseAuthCookie = (firebaseUser: FirebaseUser | null): void => {
  if (typeof document === 'undefined') {
    return;
  }

  if (!firebaseUser) {
    document.cookie = `${AUTH_COOKIE_NAME}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT;`;
    return;
  }

  const firebaseCookie = JSON.stringify({
    uid: firebaseUser.uid,
    email: firebaseUser.email,
    stsTokenManager: firebaseUser.stsTokenManager,
  });

  document.cookie = `${AUTH_COOKIE_NAME}=${encodeURIComponent(firebaseCookie)}; path=/;`;
};

export const hasRequiredRole = (user: AuthUser | null, allowedRoles: Role[]): boolean =>
  Boolean(user && allowedRoles.includes(user.role));

export const registerUser = async ({ role, ...payload }: RegisterPayload): Promise<AuthUser> => {
  const { user } = await createUserWithEmailAndPassword(
    firebaseAuth,
    payload.email,
    payload.password,
  );

  const normalizedDisplayName = payload.displayName.trim();
  await firebaseUpdateProfile(user, { displayName: normalizedDisplayName || undefined });

  const resolvedRole = role ?? DEFAULT_ROLE;
  const { firstName, lastName } = extractNameParts(normalizedDisplayName);
  await persistUserProfile(
    user,
    {
      role: resolvedRole,
      displayName: normalizedDisplayName,
      firstName,
      lastName,
      photoURL: null,
      organizationId: null,
      browserstackCredentials: null,
      isNew: true,
    },
    null,
  );

  if (!user.emailVerified) {
    await sendEmailVerification(user);
  }

  persistFirebaseAuthCookie(user);

  const profile = await fetchUserProfile(user.uid);
  const organizationId = await addUserToOrganizationByEmailDomain({
    uid: user.uid,
    email: user.email ?? '',
    displayName: normalizedDisplayName || payload.email,
    photoURL: null,
  });

  return mapToAuthUser(user, {
    ...profile,
    organizationId: organizationId ?? profile.organizationId ?? null,
  });
};

export const loginUser = async ({ email, password }: LoginPayload): Promise<AuthUser> => {
  const credential = await signInWithEmailAndPassword(firebaseAuth, email, password);

  if (!credential.user.emailVerified) {
    await sendEmailVerification(credential.user);
  }

  persistFirebaseAuthCookie(credential.user);

  const profile = await fetchUserProfile(credential.user.uid);
  const organizationId = await addUserToOrganizationByEmailDomain({
    uid: credential.user.uid,
    email: credential.user.email ?? email,
    displayName: credential.user.displayName ?? email,
    photoURL: null,
  });

  return mapToAuthUser(credential.user, {
    ...profile,
    organizationId: organizationId ?? profile.organizationId ?? null,
  });
};

export const logoutUser = (): Promise<void> => signOut(firebaseAuth);

export const sendPasswordReset = (email: string): Promise<void> =>
  sendPasswordResetEmail(firebaseAuth, email);

export const getCurrentUser = async (): Promise<AuthUser | null> => {
  const user = firebaseAuth.currentUser;
  if (!user) {
    return null;
  }

  const profile = await fetchUserProfile(user.uid);
  return mapToAuthUser(user, profile);
};

export const onAuthStateChanged = (listener: AuthStateListener): (() => void) =>
  firebaseOnAuthStateChanged(firebaseAuth, async (user) => {
    if (!user) {
      persistFirebaseAuthCookie(null);
      listener(null);
      return;
    }

    persistFirebaseAuthCookie(user);

    const profile = await fetchUserProfile(user.uid);
    const organizationId = await addUserToOrganizationByEmailDomain({
      uid: user.uid,
      email: user.email ?? '',
      displayName: user.displayName ?? user.email ?? '',
      photoURL: null,
    });

    listener(
      mapToAuthUser(user, {
        ...profile,
        organizationId: organizationId ?? profile.organizationId ?? null,
      }),
    );
  });

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

const parseBrowserstackCredentials = (value: unknown): BrowserstackCredentials | null => {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const credentials = value as BrowserstackCredentials;
  const username = typeof credentials.username === 'string' ? credentials.username.trim() : '';
  const accessKey = typeof credentials.accessKey === 'string' ? credentials.accessKey.trim() : '';

  if (!username && !accessKey) {
    return null;
  }

  return { username, accessKey };
};

export const updateUserProfile = async (payload: UpdateProfilePayload): Promise<AuthUser> => {
  const user = firebaseAuth.currentUser;
  if (!user) {
    throw new Error('Usuário não autenticado.');
  }

  const currentProfile = await fetchUserProfile(user.uid);
  const photoURL = null;

  const trimmedFirstName = payload.firstName.trim();
  const trimmedLastName = payload.lastName.trim();
  const displayName = `${trimmedFirstName} ${trimmedLastName}`.trim();
  const browserstackCredentials = normalizeBrowserstackCredentials(payload.browserstackCredentials);

  await firebaseUpdateProfile(user, {
    displayName: displayName || undefined,
    photoURL,
  });

  await persistUserProfile(
    user,
    {
      role: currentProfile.role,
      displayName,
      firstName: trimmedFirstName,
      lastName: trimmedLastName,
      photoURL,
      organizationId: currentProfile.organizationId ?? null,
      browserstackCredentials,
      isNew: false,
    },
    browserstackCredentials,
  );

  const refreshedProfile = await fetchUserProfile(user.uid);
  return mapToAuthUser(firebaseAuth.currentUser ?? user, refreshedProfile);
};

interface StoredProfile {
  role: Role;
  displayName?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  photoURL?: string | null;
  organizationId?: string | null;
  browserstackCredentials?: BrowserstackCredentials | null;
}

const mapToAuthUser = (user: FirebaseUser, profile: StoredProfile): AuthUser => {
  const storedFirstName = (profile.firstName ?? '').trim();
  const storedLastName = (profile.lastName ?? '').trim();
  const nameFromParts = `${storedFirstName} ${storedLastName}`.trim();
  const computedDisplayName =
    (profile.displayName ?? '').trim() ||
    nameFromParts ||
    (user.displayName ?? '') ||
    (user.email ?? '') ||
    '';
  const [computedFirstName, ...computedLastNameParts] = computedDisplayName.split(/\s+/);
  const effectiveFirstName = storedFirstName || computedFirstName || '';
  const effectiveLastName = storedLastName || computedLastNameParts.join(' ');

  return {
    uid: user.uid,
    email: user.email ?? '',
    displayName: computedDisplayName,
    firstName: effectiveFirstName,
    lastName: effectiveLastName,
    role: profile.role,
    organizationId: profile.organizationId ?? null,
    browserstackCredentials: profile.browserstackCredentials ?? null,
    photoURL: profile.photoURL ?? null,
    accessToken: user.refreshToken,
    isEmailVerified: user.emailVerified,
  };
};

const persistUserProfile = async (
  user: FirebaseUser,
  profile: {
    role: Role;
    displayName: string;
    firstName: string;
    lastName: string;
    photoURL?: string | null;
    organizationId: string | null;
    browserstackCredentials: BrowserstackCredentials | null;
    isNew?: boolean;
  },
  browserstackCredentials: BrowserstackCredentials | null,
): Promise<void> => {
  const userDoc = doc(firebaseFirestore, USERS_COLLECTION, user.uid);
  await setDoc(
    userDoc,
    {
      email: user.email,
      displayName: profile.displayName,
      firstName: profile.firstName,
      lastName: profile.lastName,
      role: profile.role,
      photoURL: profile.photoURL ?? null,
      organizationId: profile.organizationId,
      browserstackCredentials,
      ...(profile.isNew ? { createdAt: serverTimestamp() } : {}),
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );
};

const fetchUserProfile = async (uid: string): Promise<StoredProfile> => {
  const userDoc = doc(firebaseFirestore, USERS_COLLECTION, uid);
  const snapshot = await getDoc(userDoc);

  if (snapshot.exists()) {
    const data = snapshot.data();
    return {
      role: (data.role as Role) ?? DEFAULT_ROLE,
      displayName: (data.displayName as string) ?? '',
      firstName: (data.firstName as string) ?? '',
      lastName: (data.lastName as string) ?? '',
      photoURL: (data.photoURL as string | null) ?? null,
      organizationId: (data.organizationId as string | null) ?? null,
      browserstackCredentials: parseBrowserstackCredentials(data?.browserstackCredentials),
    };
  }

  return {
    role: DEFAULT_ROLE,
    displayName: '',
    firstName: '',
    lastName: '',
    photoURL: null,
    organizationId: null,
    browserstackCredentials: null,
  };
};

const extractNameParts = (fullName: string): { firstName: string; lastName: string } => {
  const trimmed = fullName.trim();
  if (!trimmed) {
    return { firstName: '', lastName: '' };
  }

  const [first, ...rest] = trimmed.split(/\s+/);
  return {
    firstName: first ?? '',
    lastName: rest.join(' '),
  };
};
