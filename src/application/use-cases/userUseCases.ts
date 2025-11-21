import type { UserRepository } from '../../domain/repositories/UserRepository';
import type { UserSummary } from '../../domain/entities/types';

export class UserUseCases {
  constructor(private readonly userRepository: UserRepository) {}

  getSummariesByIds(ids: string[]): Promise<UserSummary[]> {
    return this.userRepository.getSummariesByIds(ids);
  }
}
