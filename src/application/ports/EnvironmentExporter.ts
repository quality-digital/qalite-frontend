import type { Environment } from '../../domain/entities/Environment';
import type { EnvironmentBug } from '../../domain/entities/EnvironmentBug';
import type { UserSummary } from '../../domain/entities/UserSummary';

export interface EnvironmentExporter {
  exportAsPDF(
    environment: Environment,
    bugs?: EnvironmentBug[],
    participants?: UserSummary[],
  ): void;
  copyAsMarkdown(
    environment: Environment,
    bugs?: EnvironmentBug[],
    participants?: UserSummary[],
  ): Promise<void>;
}
