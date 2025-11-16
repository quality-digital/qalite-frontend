export type EnvironmentStatusErrorCode = 'PENDING_SCENARIOS' | 'INVALID_ENVIRONMENT';

export class EnvironmentStatusError extends Error {
  constructor(
    public readonly code: EnvironmentStatusErrorCode,
    message: string,
  ) {
    super(message);
    this.name = 'EnvironmentStatusError';
  }
}
