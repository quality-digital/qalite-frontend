import type { AuthUser } from '../../domain/entities/AuthUser';
import type { Role } from '../../domain/entities/Role';
import type {
  IAuthRepository,
  UpdateProfilePayload,
} from '../../domain/repositories/AuthRepository';
import { GetCurrentUser } from '../../domain/usecases/GetCurrentUser';
import { LoginUser, type LoginUserInput } from '../../domain/usecases/LoginUser';
import { LogoutUser } from '../../domain/usecases/LogoutUser';
import { ObserveAuthState } from '../../domain/usecases/ObserveAuthState';
import { RegisterUser, type RegisterUserInput } from '../../domain/usecases/RegisterUser';
import { ResetPassword } from '../../domain/usecases/ResetPassword';
import { UpdateUserProfile } from '../../domain/usecases/UpdateUserProfile';

export class AuthService {
  private readonly registerUser: RegisterUser;
  private readonly loginUser: LoginUser;
  private readonly logoutUser: LogoutUser;
  private readonly resetPassword: ResetPassword;
  private readonly getCurrentUser: GetCurrentUser;
  private readonly observeAuthState: ObserveAuthState;
  private readonly updateUserProfile: UpdateUserProfile;

  constructor(authRepository: IAuthRepository) {
    this.registerUser = new RegisterUser(authRepository);
    this.loginUser = new LoginUser(authRepository);
    this.logoutUser = new LogoutUser(authRepository);
    this.resetPassword = new ResetPassword(authRepository);
    this.getCurrentUser = new GetCurrentUser(authRepository);
    this.observeAuthState = new ObserveAuthState(authRepository);
    this.updateUserProfile = new UpdateUserProfile(authRepository);
  }

  register(input: RegisterUserInput): Promise<AuthUser> {
    return this.registerUser.execute(input);
  }

  login(input: LoginUserInput): Promise<AuthUser> {
    return this.loginUser.execute(input);
  }

  logout(): Promise<void> {
    return this.logoutUser.execute();
  }

  sendPasswordReset(email: string): Promise<void> {
    return this.resetPassword.execute(email);
  }

  getCurrent(): Promise<AuthUser | null> {
    return this.getCurrentUser.execute();
  }

  onAuthStateChanged(listener: (user: AuthUser | null) => void): () => void {
    return this.observeAuthState.execute(listener);
  }

  hasRequiredRole(user: AuthUser | null, allowedRoles: Role[]): boolean {
    if (!user) return false;
    return allowedRoles.includes(user.role);
  }

  updateProfile(input: UpdateProfilePayload): Promise<AuthUser> {
    return this.updateUserProfile.execute(input);
  }
}
