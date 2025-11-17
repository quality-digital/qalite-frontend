import type { UserSummary } from '../entities/UserSummary';

export interface IUserRepository {
  getSummariesByIds(userIds: string[]): Promise<UserSummary[]>;
}
