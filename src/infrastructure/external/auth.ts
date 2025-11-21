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
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';

import type {
  AuthStateListener,
  LoginPayload,
  RegisterPayload,
  UpdateProfilePayload,
} from '../../application/dto/AuthDto';
import type { AuthUser, Role } from '../../domain/entities/auth';
import { DEFAULT_ROLE } from '../../domain/entities/auth';
import { firebaseAuth, firebaseFirestore, firebaseStorage } from '../database/firebase';

const USERS_COLLECTION = 'users';
const USER_AVATAR_FILE = 'avatar.jpg';

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
  await persistUserProfile(user, {
    role: resolvedRole,
    displayName: normalizedDisplayName,
    firstName,
    lastName,
    photoURL: user.photoURL ?? null,
    organizationId: null,
    isNew: true,
  });

  if (!user.emailVerified) {
    await sendEmailVerification(user);
  }

  const profile = await fetchUserProfile(user.uid);
  return mapToAuthUser(user, profile);
};

export const loginUser = async ({ email, password }: LoginPayload): Promise<AuthUser> => {
  const credential = await signInWithEmailAndPassword(firebaseAuth, email, password);

  if (!credential.user.emailVerified) {
    await sendEmailVerification(credential.user);
  }

  const profile = await fetchUserProfile(credential.user.uid);
  return mapToAuthUser(credential.user, profile);
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
      listener(null);
      return;
    }

    const profile = await fetchUserProfile(user.uid);
    listener(mapToAuthUser(user, profile));
  });

export const updateUserProfile = async (payload: UpdateProfilePayload): Promise<AuthUser> => {
  const user = firebaseAuth.currentUser;
  if (!user) {
    throw new Error('Usuário não autenticado.');
  }

  const currentProfile = await fetchUserProfile(user.uid);

  let photoURL = currentProfile.photoURL ?? user.photoURL ?? null;
  if (payload.photoFile) {
    photoURL = await uploadProfilePhoto(user.uid, payload.photoFile);
  }

  const trimmedFirstName = payload.firstName.trim();
  const trimmedLastName = payload.lastName.trim();
  const displayName = `${trimmedFirstName} ${trimmedLastName}`.trim();

  await firebaseUpdateProfile(user, {
    displayName: displayName || undefined,
    photoURL: photoURL ?? undefined,
  });

  await persistUserProfile(user, {
    role: currentProfile.role,
    displayName,
    firstName: trimmedFirstName,
    lastName: trimmedLastName,
    photoURL,
    organizationId: currentProfile.organizationId ?? null,
    isNew: false,
  });

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
    photoURL: profile.photoURL ?? user.photoURL ?? undefined,
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
    isNew?: boolean;
  },
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
    };
  }

  return {
    role: DEFAULT_ROLE,
    displayName: '',
    firstName: '',
    lastName: '',
    photoURL: null,
    organizationId: null,
  };
};

const uploadProfilePhoto = async (uid: string, file: File): Promise<string> => {
  const storageRef = ref(firebaseStorage, `${USERS_COLLECTION}/${uid}/${USER_AVATAR_FILE}`);
  await uploadBytes(storageRef, file);
  return getDownloadURL(storageRef);
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
