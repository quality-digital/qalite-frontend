import { AuthService } from '../../application/services/AuthService';
import { FirebaseAuthRepository } from '../../infra/repositories/FirebaseAuthRepository';

const authRepository = new FirebaseAuthRepository();

export const authService = new AuthService(authRepository);
