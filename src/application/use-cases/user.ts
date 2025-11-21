import { firebaseUserRepository } from '../../infrastructure/repositories/firebaseUserRepository';
import { UserUseCases } from './userUseCases';

export const userUseCases = new UserUseCases(firebaseUserRepository);
export const userService = userUseCases;
