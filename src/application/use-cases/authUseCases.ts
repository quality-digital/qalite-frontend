import type { AuthRepository } from '../../domain/repositories/AuthRepository';
import type { AuthUser } from '../../domain/entities/auth';
import type {
  AuthStateListener,
  LoginPayload,
  RegisterPayload,
  UpdateProfilePayload,
} from '../dto/auth';

export class AuthUseCases {
  constructor(private readonly authRepository: AuthRepository) {}

  register(payload: RegisterPayload): Promise<AuthUser> {
    return this.authRepository.register(payload);
  }

  login(payload: LoginPayload): Promise<AuthUser> {
    return this.authRepository.login(payload);
  }

  logout(): Promise<void> {
    return this.authRepository.logout();
  }

  sendPasswordReset(email: string): Promise<void> {
    return this.authRepository.sendPasswordReset(email);
  }

  getCurrent(): Promise<AuthUser | null> {
    return this.authRepository.getCurrent();
  }

  onAuthStateChanged(listener: AuthStateListener): () => void {
    return this.authRepository.onAuthStateChanged(listener);
  }

  hasRequiredRole(user: AuthUser | null, allowedRoles: AuthUser['role'][]): boolean {
    return this.authRepository.hasRequiredRole(user, allowedRoles);
  }

  updateProfile(payload: UpdateProfilePayload): Promise<AuthUser> {
    return this.authRepository.updateProfile(payload);
  }
}
