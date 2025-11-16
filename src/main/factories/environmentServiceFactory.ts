import { EnvironmentService } from '../../application/services/EnvironmentService';
import { FirebaseEnvironmentRepository } from '../../infra/repositories/FirebaseEnvironmentRepository';
import { BrowserEnvironmentExporter } from '../../infra/services/BrowserEnvironmentExporter';

const environmentRepository = new FirebaseEnvironmentRepository();
const environmentExporter = new BrowserEnvironmentExporter();

export const environmentService = new EnvironmentService(
  environmentRepository,
  environmentExporter,
);
