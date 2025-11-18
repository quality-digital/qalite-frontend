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

import { AuthUser } from '../../domain/entities/AuthUser';
import { DEFAULT_ROLE, Role } from '../../domain/entities/Role';
import {
  AuthStateListener,
  IAuthRepository,
  LoginPayload,
  RegisterPayload,
  UpdateProfilePayload,
} from '../../domain/repositories/AuthRepository';
import { firebaseAuth, firebaseFirestore, firebaseStorage } from '../firebase/firebaseConfig';

const USERS_COLLECTION = 'users';
const USER_AVATAR_FILE = 'avatar.jpg';

export class FirebaseAuthRepository implements IAuthRepository {
  async register(payload: RegisterPayload): Promise<AuthUser> {
    const { user } = await createUserWithEmailAndPassword(
      firebaseAuth,
      payload.email,
      payload.password,
    );

    const normalizedDisplayName = payload.displayName.trim();

    await firebaseUpdateProfile(user, { displayName: normalizedDisplayName || undefined });

    const role = payload.role;
    const { firstName, lastName } = this.extractNameParts(normalizedDisplayName);
    await this.persistUserProfile(user, {
      role,
      displayName: normalizedDisplayName,
      firstName,
      lastName,
      phoneNumber: '',
      photoURL: user.photoURL ?? null,
      organizationId: null,
      isNew: true,
    });

    if (!user.emailVerified) {
      await sendEmailVerification(user);
    }

    const profile = await this.fetchUserProfile(user.uid);
    return this.mapToAuthUser(user, profile);
  }

  async login(payload: LoginPayload): Promise<AuthUser> {
    const credential = await signInWithEmailAndPassword(
      firebaseAuth,
      payload.email,
      payload.password,
    );

    if (!credential.user.emailVerified) {
      await sendEmailVerification(credential.user);
    }

    const profile = await this.fetchUserProfile(credential.user.uid);
    return this.mapToAuthUser(credential.user, profile);
  }

  async logout(): Promise<void> {
    await signOut(firebaseAuth);
  }

  async sendPasswordReset(email: string): Promise<void> {
    await sendPasswordResetEmail(firebaseAuth, email);
  }

  async getCurrentUser(): Promise<AuthUser | null> {
    const user = firebaseAuth.currentUser;
    if (!user) {
      return null;
    }

    const profile = await this.fetchUserProfile(user.uid);
    return this.mapToAuthUser(user, profile);
  }

  onAuthStateChanged(listener: AuthStateListener): () => void {
    return firebaseOnAuthStateChanged(firebaseAuth, async (user) => {
      if (!user) {
        listener(null);
        return;
      }

      const profile = await this.fetchUserProfile(user.uid);
      listener(this.mapToAuthUser(user, profile));
    });
  }

  async updateProfile(payload: UpdateProfilePayload): Promise<AuthUser> {
    const user = firebaseAuth.currentUser;
    if (!user) {
      throw new Error('Usuário não autenticado.');
    }

    const currentProfile = await this.fetchUserProfile(user.uid);

    let photoURL = currentProfile.photoURL ?? user.photoURL ?? null;
    if (payload.photoFile) {
      photoURL = await this.uploadProfilePhoto(user.uid, payload.photoFile);
    }

    const trimmedFirstName = payload.firstName.trim();
    const trimmedLastName = payload.lastName.trim();
    const trimmedPhoneNumber =
      payload.phoneNumber !== undefined
        ? payload.phoneNumber.trim()
        : (currentProfile.phoneNumber ?? user.phoneNumber ?? '').trim();
    const displayName = `${trimmedFirstName} ${trimmedLastName}`.trim();

    await firebaseUpdateProfile(user, {
      displayName: displayName || undefined,
      photoURL: photoURL ?? undefined,
    });

    await this.persistUserProfile(user, {
      role: currentProfile.role,
      displayName,
      firstName: trimmedFirstName,
      lastName: trimmedLastName,
      phoneNumber: trimmedPhoneNumber,
      photoURL,
      organizationId: currentProfile.organizationId ?? null,
      isNew: false,
    });

    const refreshedProfile = await this.fetchUserProfile(user.uid);
    return this.mapToAuthUser(firebaseAuth.currentUser ?? user, refreshedProfile);
  }

  private mapToAuthUser(
    user: FirebaseUser,
    profile: {
      role: Role;
      displayName?: string | null;
      firstName?: string | null;
      lastName?: string | null;
      phoneNumber?: string | null;
      photoURL?: string | null;
      organizationId?: string | null;
    },
  ): AuthUser {
    const storedFirstName = (profile.firstName ?? '').trim();
    const storedLastName = (profile.lastName ?? '').trim();
    const storedPhoneNumber = (profile.phoneNumber ?? '').trim();
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
    const effectivePhoneNumber = storedPhoneNumber || (user.phoneNumber ?? '').trim();

    return {
      uid: user.uid,
      email: user.email ?? '',
      displayName: computedDisplayName,
      firstName: effectiveFirstName,
      lastName: effectiveLastName,
      phoneNumber: effectivePhoneNumber,
      role: profile.role,
      organizationId: profile.organizationId ?? null,
      photoURL: profile.photoURL ?? user.photoURL ?? undefined,
      accessToken: user.refreshToken,
      isEmailVerified: user.emailVerified,
    };
  }

  private async persistUserProfile(
    user: FirebaseUser,
    profile: {
      role: Role;
      displayName: string;
      firstName: string;
      lastName: string;
      phoneNumber: string;
      photoURL?: string | null;
      organizationId: string | null;
      isNew?: boolean;
    },
  ): Promise<void> {
    const userDoc = doc(firebaseFirestore, USERS_COLLECTION, user.uid);
    await setDoc(
      userDoc,
      {
        email: user.email,
        displayName: profile.displayName,
        firstName: profile.firstName,
        lastName: profile.lastName,
        phoneNumber: profile.phoneNumber,
        role: profile.role,
        photoURL: profile.photoURL ?? null,
        organizationId: profile.organizationId,
        ...(profile.isNew ? { createdAt: serverTimestamp() } : {}),
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    );
  }

  private async fetchUserProfile(uid: string): Promise<{
    role: Role;
    displayName?: string | null;
    firstName?: string | null;
    lastName?: string | null;
    phoneNumber?: string | null;
    photoURL?: string | null;
    organizationId?: string | null;
  }> {
    const userDoc = doc(firebaseFirestore, USERS_COLLECTION, uid);
    const snapshot = await getDoc(userDoc);

    if (snapshot.exists()) {
      const data = snapshot.data();
      return {
        role: (data.role as Role) ?? DEFAULT_ROLE,
        displayName: (data.displayName as string) ?? '',
        firstName: (data.firstName as string) ?? '',
        lastName: (data.lastName as string) ?? '',
        phoneNumber: (data.phoneNumber as string) ?? '',
        photoURL: (data.photoURL as string | null) ?? null,
        organizationId: (data.organizationId as string | null) ?? null,
      };
    }

    return {
      role: DEFAULT_ROLE,
      displayName: '',
      firstName: '',
      lastName: '',
      phoneNumber: '',
      photoURL: null,
      organizationId: null,
    };
  }

  private async uploadProfilePhoto(uid: string, file: File): Promise<string> {
    const storageRef = ref(firebaseStorage, `${USERS_COLLECTION}/${uid}/${USER_AVATAR_FILE}`);
    await uploadBytes(storageRef, file);
    return getDownloadURL(storageRef);
  }

  private extractNameParts(fullName: string): { firstName: string; lastName: string } {
    const trimmed = fullName.trim();
    if (!trimmed) {
      return { firstName: '', lastName: '' };
    }

    const [first, ...rest] = trimmed.split(/\s+/);
    return {
      firstName: first ?? '',
      lastName: rest.join(' '),
    };
  }
}
