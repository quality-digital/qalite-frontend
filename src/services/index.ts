import {
  addEnvironmentUser,
  copyEnvironmentAsMarkdown,
  createEnvironment,
  createEnvironmentBug,
  deleteEnvironment,
  deleteEnvironmentBug,
  observeEnvironment,
  observeEnvironmentBugs,
  observeEnvironments,
  removeEnvironmentUser,
  transitionEnvironmentStatus,
  updateEnvironment,
  updateEnvironmentBug,
  updateScenarioStatus,
  uploadScenarioEvidence,
  exportEnvironmentAsPDF,
} from '../lib/environments';
import {
  addUserToOrganization,
  createOrganization,
  deleteOrganization,
  getOrganization,
  getUserOrganization,
  listOrganizations,
  removeUserFromOrganization,
  updateOrganization,
} from '../lib/organizations';
import {
  createScenarioExecution,
  getStoreScenarioAverages,
  listScenarioExecutionsByStore,
  logScenarioExecution,
} from '../lib/scenarioExecutions';
import {
  createStore,
  createCategory,
  createScenario,
  createSuite,
  deleteCategory,
  deleteScenario,
  deleteStore,
  deleteSuite,
  exportStoreData,
  exportStoreSuites,
  getStore,
  importStoreScenarios,
  importStoreSuites,
  listCategories,
  listScenarios,
  listStores,
  listSuites,
  mergeScenarios,
  mergeSuites,
  replaceScenarios,
  replaceSuites,
  updateCategory,
  updateScenario,
  updateStore,
  updateSuite,
} from '../lib/stores';
import {
  getCurrentUser,
  hasRequiredRole,
  loginUser,
  logoutUser,
  onAuthStateChanged,
  registerUser,
  sendPasswordReset,
  updateUserProfile,
} from '../lib/auth';
import { getUserSummariesByIds } from '../lib/users';
import { sendEnvironmentSummaryToSlack } from '../lib/slack';
import { listOrganizationLogs, logActivity } from '../lib/logs';

export const authService = {
  register: registerUser,
  login: loginUser,
  logout: logoutUser,
  sendPasswordReset,
  getCurrent: getCurrentUser,
  onAuthStateChanged,
  hasRequiredRole,
  updateProfile: updateUserProfile,
};

export const environmentService = {
  create: createEnvironment,
  update: updateEnvironment,
  delete: deleteEnvironment,
  observeEnvironment,
  observeAll: observeEnvironments,
  addUser: addEnvironmentUser,
  removeUser: removeEnvironmentUser,
  updateScenarioStatus,
  uploadScenarioEvidence,
  observeBugs: observeEnvironmentBugs,
  createBug: createEnvironmentBug,
  updateBug: updateEnvironmentBug,
  deleteBug: deleteEnvironmentBug,
  transitionStatus: transitionEnvironmentStatus,
  exportAsPDF: exportEnvironmentAsPDF,
  copyAsMarkdown: copyEnvironmentAsMarkdown,
};

export const organizationService = {
  list: listOrganizations,
  getById: getOrganization,
  create: createOrganization,
  update: updateOrganization,
  delete: deleteOrganization,
  addUser: addUserToOrganization,
  removeUser: removeUserFromOrganization,
  getUserOrganizationByUserId: getUserOrganization,
};

export const storeService = {
  listByOrganization: listStores,
  getById: getStore,
  create: createStore,
  update: updateStore,
  delete: deleteStore,
  listScenarios,
  createScenario,
  updateScenario,
  deleteScenario,
  listSuites,
  createSuite,
  updateSuite,
  deleteSuite,
  listCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  exportStore: exportStoreData,
  exportSuites: exportStoreSuites,
  importScenarios: importStoreScenarios,
  importSuites: importStoreSuites,
  replaceScenarios,
  replaceSuites,
  mergeScenarios,
  mergeSuites,
};

export const userService = {
  getSummariesByIds: getUserSummariesByIds,
};

export const scenarioExecutionService = {
  logExecution: logScenarioExecution,
  getStoreScenarioAverages,
  listByStore: listScenarioExecutionsByStore,
  create: createScenarioExecution,
};

export const slackService = {
  sendTaskSummary: sendEnvironmentSummaryToSlack,
};

export const logService = {
  record: logActivity,
  listByOrganization: listOrganizationLogs,
};
