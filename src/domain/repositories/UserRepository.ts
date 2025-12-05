import type { UserSummary } from '../entities/user';

export interface UserRepository {
  getSummariesByIds: (ids: string[]) => Promise<UserSummary[]>;
  searchByTerm: (term: string) => Promise<UserSummary[]>;
}
