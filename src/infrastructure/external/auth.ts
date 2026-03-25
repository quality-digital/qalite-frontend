import {
  User as FirebaseUser,
  GithubAuthProvider,
  GoogleAuthProvider,
  confirmPasswordReset,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  onIdTokenChanged,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile as firebaseUpdateProfile,
  verifyPasswordResetCode,
} from 'firebase/auth';
import { doc, onSnapshot, serverTimestamp, setDoc } from 'firebase/firestore';

import type {
  AuthUser,
  LoginPayload,
  RegisterPayload,
  Role,
  UpdateProfilePayload,
  UserPreferences,
} from '../../domain/entities/auth';
import type { BrowserstackCredentials } from '../../domain/entities/browserstack';
import { DEFAULT_ROLE, DEFAULT_USER_PREFERENCES } from '../../domain/entities/auth';
import { addUserToOrganizationByEmailDomain } from './organizations';
import { firebaseAuth, firebaseFirestore } from '../database/firebase';
import { getDocCacheFirst } from './firestoreCache';
import { buildStorageFileName, uploadFileAndGetUrl } from './storage';
import {
  getStoredLanguagePreference,
  getStoredThemePreference,
  normalizeUserPreferences,
} from '../../shared/config/userPreferences';

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
    accessToken: firebaseUser.refreshToken,
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
      preferences: getInitialPreferences(),
      isNew: true,
    },
    null,
  );

  if (!user.emailVerified) {
    void sendEmailVerification(user);
  }

  persistFirebaseAuthCookie(user);

  const organizationId = await addUserToOrganizationByEmailDomain({
    uid: user.uid,
    email: user.email ?? '',
    displayName: normalizedDisplayName || payload.email,
    photoURL: null,
  });

  const resolvedProfile: StoredProfile = {
    role: resolvedRole,
    displayName: normalizedDisplayName,
    firstName,
    lastName,
    photoURL: null,
    organizationId: organizationId ?? null,
    browserstackCredentials: null,
    preferences: getInitialPreferences(),
  };
  return mapToAuthUser(user, resolvedProfile);
};

export const loginUser = async ({ email, password }: LoginPayload): Promise<AuthUser> => {
  const credential = await signInWithEmailAndPassword(firebaseAuth, email, password);

  if (!credential.user.emailVerified) {
    void sendEmailVerification(credential.user);
  }

  persistFirebaseAuthCookie(credential.user);

  const profile = await fetchUserProfile(credential.user.uid);
  const organizationId = profile.organizationId
    ? profile.organizationId
    : await addUserToOrganizationByEmailDomain({
        uid: credential.user.uid,
        email: credential.user.email ?? email,
        displayName: credential.user.displayName ?? email,
        photoURL: null,
      });

  const resolvedProfile = {
    ...profile,
    organizationId: organizationId ?? profile.organizationId ?? null,
  };
  return mapToAuthUser(credential.user, resolvedProfile);
};

const loginWithProvider = async (
  provider: GoogleAuthProvider | GithubAuthProvider,
): Promise<AuthUser> => {
  const credential = await signInWithPopup(firebaseAuth, provider);
  const firebaseUser = credential.user;

  persistFirebaseAuthCookie(firebaseUser);

  const displayName = (firebaseUser.displayName ?? '').trim();
  const { firstName, lastName } = extractNameParts(displayName);
  const existingProfile = await fetchUserProfile(firebaseUser.uid);

  const organizationId = existingProfile.organizationId
    ? existingProfile.organizationId
    : await addUserToOrganizationByEmailDomain({
        uid: firebaseUser.uid,
        email: firebaseUser.email ?? '',
        displayName: displayName || firebaseUser.email || '',
        photoURL: firebaseUser.photoURL ?? null,
      });

  const resolvedProfile: StoredProfile = {
    role: existingProfile.role ?? DEFAULT_ROLE,
    displayName: displayName || existingProfile.displayName || firebaseUser.email || '',
    firstName: existingProfile.firstName || firstName,
    lastName: existingProfile.lastName || lastName,
    photoURL: firebaseUser.photoURL ?? existingProfile.photoURL ?? null,
    organizationId: organizationId ?? existingProfile.organizationId ?? null,
    browserstackCredentials: existingProfile.browserstackCredentials ?? null,
    preferences: existingProfile.preferences ?? getInitialPreferences(),
  };

  await persistUserProfile(
    firebaseUser,
    {
      ...resolvedProfile,
      isNew: false,
    },
    resolvedProfile.browserstackCredentials ?? null,
  );

  return mapToAuthUser(firebaseUser, resolvedProfile);
};

export const loginWithGoogle = async (): Promise<AuthUser> => {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  return loginWithProvider(provider);
};

export const loginWithGithub = async (): Promise<AuthUser> => {
  const provider = new GithubAuthProvider();
  provider.setCustomParameters({ allow_signup: 'true' });
  return loginWithProvider(provider);
};

export const logoutUser = async (): Promise<void> => {
  persistFirebaseAuthCookie(null);
  await signOut(firebaseAuth);
};

export const sendPasswordReset = (email: string): Promise<void> =>
  sendPasswordResetEmail(firebaseAuth, email);

export const verifyPasswordResetCodeFunction = async (code: string): Promise<string> => {
  const email = await verifyPasswordResetCode(firebaseAuth, code);
  return email;
};

export const confirmPasswordResetFunction = async (
  code: string,
  newPassword: string,
): Promise<void> => {
  await confirmPasswordReset(firebaseAuth, code, newPassword);
};

export const getCurrentUser = async (): Promise<AuthUser | null> => {
  const user = firebaseAuth.currentUser;
  if (!user) {
    return null;
  }

  const profile = await fetchUserProfile(user.uid);
  return mapToAuthUser(user, profile);
};

export const subscribeToAuthChanges = (onChange: (user: AuthUser | null) => void): (() => void) => {
  let unsubscribeProfile: (() => void) | null = null;

  const unsubscribeAuth = onAuthStateChanged(firebaseAuth, async (user) => {
    unsubscribeProfile?.();
    unsubscribeProfile = null;

    if (!user) {
      persistFirebaseAuthCookie(null);
      onChange(null);
      return;
    }

    try {
      const userDoc = doc(firebaseFirestore, USERS_COLLECTION, user.uid);

      unsubscribeProfile = onSnapshot(
        userDoc,
        (snapshot) => {
          const data = snapshot.exists()
            ? snapshot.data({ serverTimestamps: 'estimate' })
            : undefined;

          const profile = data
            ? {
                role: (data.role as Role) ?? DEFAULT_ROLE,
                displayName: (data.displayName as string) ?? '',
                firstName: (data.firstName as string) ?? '',
                lastName: (data.lastName as string) ?? '',
                photoURL: (data.photoURL as string | null) ?? null,
                organizationId: (data.organizationId as string | null) ?? null,
                browserstackCredentials: parseBrowserstackCredentials(
                  data?.browserstackCredentials,
                ),
                preferences: normalizeUserPreferences(data?.preferences, getInitialPreferences()),
              }
            : {
                role: DEFAULT_ROLE,
                displayName: '',
                firstName: '',
                lastName: '',
                photoURL: null,
                organizationId: null,
                browserstackCredentials: null,
                preferences: getInitialPreferences(),
              };

          onChange(mapToAuthUser(user, profile));
        },
        (error) => {
          console.error(error);
          onChange(null);
        },
      );
    } catch (error) {
      console.error(error);
      onChange(null);
    }
  });

  const unsubscribeToken = onIdTokenChanged(firebaseAuth, (user) => {
    persistFirebaseAuthCookie(user);
  });

  return () => {
    unsubscribeProfile?.();
    unsubscribeAuth();
    unsubscribeToken();
  };
};

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

const getInitialPreferences = (): UserPreferences => ({
  theme: getStoredThemePreference() ?? DEFAULT_USER_PREFERENCES.theme,
  language: getStoredLanguagePreference() ?? DEFAULT_USER_PREFERENCES.language,
});

export const updateUserProfile = async (payload: UpdateProfilePayload): Promise<AuthUser> => {
  const user = firebaseAuth.currentUser;
  if (!user) {
    throw new Error('Usuário não autenticado.');
  }

  const currentProfile = await fetchUserProfile(user.uid);
  const resolvedPhotoUrl = payload.photoFile
    ? await uploadFileAndGetUrl(
        `users/${user.uid}/profile/${buildStorageFileName(payload.photoFile)}`,
        payload.photoFile,
      )
    : (currentProfile.photoURL ?? user.photoURL ?? null);

  const trimmedFirstName = payload.firstName?.trim() ?? currentProfile.firstName ?? '';
  const trimmedLastName = payload.lastName?.trim() ?? currentProfile.lastName ?? '';
  const displayName =
    payload.firstName || payload.lastName
      ? `${trimmedFirstName} ${trimmedLastName}`.trim()
      : (currentProfile.displayName ?? user.displayName ?? user.email ?? '').trim();
  const browserstackCredentials = normalizeBrowserstackCredentials(payload.browserstackCredentials);
  const preferences = payload.preferences
    ? normalizeUserPreferences(
        payload.preferences,
        currentProfile.preferences ?? getInitialPreferences(),
      )
    : (currentProfile.preferences ?? getInitialPreferences());

  await firebaseUpdateProfile(user, {
    displayName: displayName || undefined,
    photoURL: resolvedPhotoUrl ?? undefined,
  });

  await persistUserProfile(
    user,
    {
      role: currentProfile.role,
      displayName,
      firstName: trimmedFirstName,
      lastName: trimmedLastName,
      photoURL: resolvedPhotoUrl ?? null,
      organizationId: currentProfile.organizationId ?? null,
      browserstackCredentials,
      preferences,
      isNew: false,
    },
    browserstackCredentials,
  );

  const updatedProfile: StoredProfile = {
    role: currentProfile.role,
    displayName,
    firstName: trimmedFirstName,
    lastName: trimmedLastName,
    photoURL: resolvedPhotoUrl ?? null,
    organizationId: currentProfile.organizationId ?? null,
    browserstackCredentials,
    preferences,
  };

  return mapToAuthUser(firebaseAuth.currentUser ?? user, updatedProfile);
};

interface StoredProfile {
  role: Role;
  displayName: string;
  firstName: string;
  lastName: string;
  photoURL: string | null;
  organizationId: string | null;
  browserstackCredentials: BrowserstackCredentials | null;
  preferences: UserPreferences;
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
    photoURL: profile.photoURL ?? undefined,
    preferences: normalizeUserPreferences(profile.preferences, getInitialPreferences()),
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
    preferences: UserPreferences;
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
      preferences: profile.preferences,
      ...(profile.isNew ? { createdAt: serverTimestamp() } : {}),
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );
};

const fetchUserProfile = async (uid: string): Promise<StoredProfile> => {
  const userDoc = doc(firebaseFirestore, USERS_COLLECTION, uid);
  try {
    const snapshot = await getDocCacheFirst(userDoc);

    if (snapshot.exists()) {
      const data = snapshot.data({ serverTimestamps: 'estimate' });
      const profile = {
        role: (data.role as Role) ?? DEFAULT_ROLE,
        displayName: (data.displayName as string) ?? '',
        firstName: (data.firstName as string) ?? '',
        lastName: (data.lastName as string) ?? '',
        photoURL: (data.photoURL as string | null) ?? null,
        organizationId: (data.organizationId as string | null) ?? null,
        browserstackCredentials: parseBrowserstackCredentials(data?.browserstackCredentials),
        preferences: normalizeUserPreferences(data?.preferences, getInitialPreferences()),
      };
      return profile;
    }
  } catch (error) {
    console.error(error);
  }

  return {
    role: DEFAULT_ROLE,
    displayName: '',
    firstName: '',
    lastName: '',
    photoURL: null,
    organizationId: null,
    browserstackCredentials: null,
    preferences: getInitialPreferences(),
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
