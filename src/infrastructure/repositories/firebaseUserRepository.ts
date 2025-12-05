import type { UserRepository } from '../../domain/repositories/UserRepository';
import { getUserSummariesByIds, searchUsersByTerm } from '../external/users';

export const firebaseUserRepository: UserRepository = {
  getSummariesByIds: getUserSummariesByIds,
  searchByTerm: searchUsersByTerm,
};
