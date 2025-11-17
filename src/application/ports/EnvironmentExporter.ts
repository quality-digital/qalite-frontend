import type { Environment } from '../../domain/entities/Environment';
import type { EnvironmentBug } from '../../domain/entities/EnvironmentBug';

export interface EnvironmentExporter {
  exportAsPDF(environment: Environment, bugs?: EnvironmentBug[]): void;
  copyAsMarkdown(environment: Environment, bugs?: EnvironmentBug[]): Promise<void>;
}
