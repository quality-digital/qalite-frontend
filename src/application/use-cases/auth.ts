import { firebaseAuthRepository } from '../../infrastructure/repositories/firebaseAuthRepository';
import { AuthUseCases } from './authUseCases';

export const authUseCases = new AuthUseCases(firebaseAuthRepository);
export const authService = authUseCases;
