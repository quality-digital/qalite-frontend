import type { UserSummary } from '../../domain/entities/UserSummary';
import type { IUserRepository } from '../../domain/repositories/UserRepository';

export class UserService {
  constructor(private readonly repository: IUserRepository) {}

  getSummariesByIds(userIds: string[]): Promise<UserSummary[]> {
    return this.repository.getSummariesByIds(userIds);
  }
}
