import type { UserSummary } from '../entities/types';

export interface UserRepository {
  getSummariesByIds: (ids: string[]) => Promise<UserSummary[]>;
}
