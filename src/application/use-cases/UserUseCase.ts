import type { UserRepository } from '../../domain/repositories/UserRepository';
import type { UserSummaryDTO } from '../dto/UserDto';
import { firebaseUserRepository } from '../../infrastructure/repositories/firebaseUserRepository';

export class UserUseCases {
  constructor(private readonly userRepository: UserRepository) {}

  getSummariesByIds(ids: string[]): Promise<UserSummaryDTO[]> {
    return this.userRepository.getSummariesByIds(ids);
  }
}

export const userUseCases = new UserUseCases(firebaseUserRepository);
export const userService = userUseCases;
