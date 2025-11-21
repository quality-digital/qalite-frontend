import type { UserRepository } from '../../domain/repositories/UserRepository';
import { getUserSummariesByIds } from '../external/users';

export const firebaseUserRepository: UserRepository = {
  getSummariesByIds: getUserSummariesByIds,
};
