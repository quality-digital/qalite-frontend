import type { EnvironmentRepository } from '../../domain/repositories/EnvironmentRepository';
import {
  addEnvironmentUser,
  copyEnvironmentAsMarkdown,
  createEnvironment,
  deleteEnvironment,
  listEnvironmentsSummary,
  observeEnvironment,
  observeEnvironments,
  removeEnvironmentUser,
  transitionEnvironmentStatus,
  updateEnvironment,
  updateScenarioStatus,
  uploadScenarioEvidence,
  exportEnvironmentAsPDF,
} from '../external/environments';

export const firebaseEnvironmentRepository: EnvironmentRepository = {
  create: createEnvironment,
  update: updateEnvironment,
  delete: deleteEnvironment,
  observeEnvironment,
  observeAll: observeEnvironments,
  listSummary: listEnvironmentsSummary,
  addUser: addEnvironmentUser,
  removeUser: removeEnvironmentUser,
  updateScenarioStatus,
  uploadScenarioEvidence,
  transitionStatus: transitionEnvironmentStatus,
  exportAsPDF: exportEnvironmentAsPDF,
  copyAsMarkdown: copyEnvironmentAsMarkdown,
};
