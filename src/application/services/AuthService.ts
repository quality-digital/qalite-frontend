import type { AuthUser } from '../../domain/entities/AuthUser';
import type { Role } from '../../domain/entities/Role';
import type {
  IAuthRepository,
  LoginPayload,
  RegisterPayload,
  UpdateProfilePayload,
} from '../../domain/repositories/AuthRepository';
export class AuthService {
  constructor(private readonly authRepository: IAuthRepository) {}

  register(input: RegisterPayload): Promise<AuthUser> {
    return this.authRepository.register(input);
  }

  login(input: LoginPayload): Promise<AuthUser> {
    return this.authRepository.login(input);
  }

  logout(): Promise<void> {
    return this.authRepository.logout();
  }

  sendPasswordReset(email: string): Promise<void> {
    return this.authRepository.sendPasswordReset(email);
  }

  getCurrent(): Promise<AuthUser | null> {
    return this.authRepository.getCurrentUser();
  }

  onAuthStateChanged(listener: (user: AuthUser | null) => void): () => void {
    return this.authRepository.onAuthStateChanged(listener);
  }

  hasRequiredRole(user: AuthUser | null, allowedRoles: Role[]): boolean {
    return Boolean(user && allowedRoles.includes(user.role));
  }

  updateProfile(input: UpdateProfilePayload): Promise<AuthUser> {
    return this.authRepository.updateProfile(input);
  }
}
