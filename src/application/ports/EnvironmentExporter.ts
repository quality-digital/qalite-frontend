import type { Environment } from '../../domain/entities/Environment';

export interface EnvironmentExporter {
  exportAsPDF(environment: Environment): void;
  exportAsMarkdown(environment: Environment): void;
}
