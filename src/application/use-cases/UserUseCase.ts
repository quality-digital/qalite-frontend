import type { UserRepository } from '../../domain/repositories/UserRepository';
import type { UserSummary } from '../../domain/entities/user';
import { firebaseUserRepository } from '../../infrastructure/repositories/firebaseUserRepository';

export class UserUseCases {
  constructor(private readonly userRepository: UserRepository) {}

  getSummariesByIds(ids: string[]): Promise<UserSummary[]> {
    return this.userRepository.getSummariesByIds(ids);
  }
}

export const userUseCases = new UserUseCases(firebaseUserRepository);
export const userService = userUseCases;
