import type { UserSummary } from '../entities/UserSummary';
import type { IUserRepository } from '../repositories/UserRepository';

export class GetUserSummaries {
  constructor(private readonly userRepository: IUserRepository) {}

  async execute(userIds: string[]): Promise<UserSummary[]> {
    const sanitizedIds = Array.from(
      new Set(userIds.map((id) => id?.trim()).filter((id): id is string => Boolean(id))),
    );

    if (sanitizedIds.length === 0) {
      return [];
    }

    return this.userRepository.getSummariesByIds(sanitizedIds);
  }
}
