import type { UserSummary } from '../../domain/entities/UserSummary';
import type { IUserRepository } from '../../domain/repositories/UserRepository';
import { GetUserSummaries } from '../../domain/usecases/GetUserSummaries';

export class UserService {
  private readonly getUserSummaries: GetUserSummaries;

  constructor(userRepository: IUserRepository) {
    this.getUserSummaries = new GetUserSummaries(userRepository);
  }

  getSummariesByIds(userIds: string[]): Promise<UserSummary[]> {
    return this.getUserSummaries.execute(userIds);
  }
}
