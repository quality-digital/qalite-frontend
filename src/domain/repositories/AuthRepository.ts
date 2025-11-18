import type { AuthUser } from '../entities/AuthUser';
import type { Role } from '../entities/Role';

export interface RegisterPayload {
  email: string;
  password: string;
  displayName: string;
  role: Role;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface AuthStateListener {
  (user: AuthUser | null): void;
}

export interface UpdateProfilePayload {
  firstName: string;
  lastName: string;
  photoFile?: File | null;
}

export interface IAuthRepository {
  register(payload: RegisterPayload): Promise<AuthUser>;
  login(payload: LoginPayload): Promise<AuthUser>;
  logout(): Promise<void>;
  sendPasswordReset(email: string): Promise<void>;
  getCurrentUser(): Promise<AuthUser | null>;
  onAuthStateChanged(listener: AuthStateListener): () => void;
  updateProfile(payload: UpdateProfilePayload): Promise<AuthUser>;
}
