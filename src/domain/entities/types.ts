export type Role = 'admin' | 'user';

export const DEFAULT_ROLE: Role = 'user';
export const AVAILABLE_ROLES: Role[] = ['admin', 'user'];

export interface AuthUser {
  uid: string;
  email: string;
  displayName: string;
  firstName: string;
  lastName: string;
  role: Role;
  organizationId?: string | null;
  accessToken?: string;
  photoURL?: string;
  isEmailVerified: boolean;
}

export interface UserProfile {
  id: string;
  email: string;
  displayName: string;
  firstName: string;
  lastName: string;
  role: Role;
  photoURL: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserSummary {
  id: string;
  displayName: string;
  email: string;
  photoURL: string | null;
}

export interface OrganizationMember {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string | null;
}

export interface Organization {
  id: string;
  name: string;
  description: string;
  logoUrl: string | null;
  members: OrganizationMember[];
  memberIds: string[];
  createdAt: Date | null;
  updatedAt: Date | null;
}

export interface Store {
  id: string;
  organizationId: string;
  name: string;
  site: string;
  stage: string;
  scenarioCount: number;
  createdAt: Date | null;
  updatedAt: Date | null;
}

export interface StoreScenario {
  id: string;
  storeId: string;
  title: string;
  category: string;
  automation: string;
  criticality: string;
  observation: string;
  bdd: string;
  createdAt: Date | null;
  updatedAt: Date | null;
}

export interface StoreScenarioInput {
  title: string;
  category: string;
  automation: string;
  criticality: string;
  observation: string;
  bdd: string;
}

export interface StoreSuite {
  id: string;
  storeId: string;
  name: string;
  description: string;
  scenarioIds: string[];
  createdAt: Date | null;
  updatedAt: Date | null;
}

export interface StoreSuiteInput {
  name: string;
  description: string;
  scenarioIds: string[];
}

export interface StoreCategory {
  id: string;
  storeId: string;
  name: string;
  createdAt: Date | null;
  updatedAt: Date | null;
}

export interface StoreCategoryInput {
  name: string;
}

export interface CreateStorePayload {
  organizationId: string;
  name: string;
  site: string;
  stage: string;
}

export interface UpdateStorePayload {
  name: string;
  site: string;
  stage: string;
}

export interface ImportScenariosResult {
  created: number;
  skipped: number;
  scenarios: StoreScenario[];
}

export interface ImportSuitesResult {
  created: number;
  skipped: number;
  suites: StoreSuite[];
}

export interface StoreExportPayload {
  store: {
    id: string;
    name: string;
    site: string;
    stage: string;
    scenarioCount: number;
  };
  exportedAt: string;
  scenarios: StoreScenario[];
}

export interface StoreSuiteExportPayload {
  store: {
    id: string;
    name: string;
    site: string;
    stage: string;
    scenarioCount: number;
  };
  exportedAt: string;
  suites: Array<{
    id: string;
    name: string;
    description: string;
    scenarios: Array<{ id: string; title: string }>;
  }>;
}

export type EnvironmentStatus = 'backlog' | 'in_progress' | 'done';

export type EnvironmentScenarioStatus =
  | 'pendente'
  | 'em_andamento'
  | 'bloqueado'
  | 'concluido'
  | 'concluido_automatizado'
  | 'nao_se_aplica';

export type EnvironmentScenarioPlatform = 'mobile' | 'desktop';

export interface EnvironmentScenario {
  titulo: string;
  categoria: string;
  criticidade: string;
  observacao: string;
  automatizado?: string;
  status: EnvironmentScenarioStatus;
  statusMobile?: EnvironmentScenarioStatus;
  statusDesktop?: EnvironmentScenarioStatus;
  evidenciaArquivoUrl: string | null;
}

export interface EnvironmentTimeTracking {
  start: string | null;
  end: string | null;
  totalMs: number;
}

export interface Environment {
  id: string;
  identificador: string;
  storeId: string;
  suiteId: string | null;
  suiteName: string | null;
  urls: string[];
  jiraTask: string;
  tipoAmbiente: string;
  tipoTeste: string;
  momento: string | null;
  release: string | null;
  status: EnvironmentStatus;
  createdAt: string | null;
  updatedAt: string | null;
  timeTracking: EnvironmentTimeTracking;
  presentUsersIds: string[];
  concludedBy: string | null;
  scenarios: Record<string, EnvironmentScenario>;
  bugs: number;
  totalCenarios: number;
  participants: string[];
}

export interface CreateEnvironmentInput {
  identificador: string;
  storeId: string;
  suiteId: string | null;
  suiteName: string | null;
  urls: string[];
  jiraTask: string;
  tipoAmbiente: string;
  tipoTeste: string;
  momento: string | null;
  release: string | null;
  status: EnvironmentStatus;
  timeTracking: EnvironmentTimeTracking;
  presentUsersIds: string[];
  concludedBy: string | null;
  scenarios: Record<string, EnvironmentScenario>;
  bugs: number;
  totalCenarios: number;
  participants: string[];
}

export type UpdateEnvironmentInput = Partial<Omit<Environment, 'id'>>;

export interface EnvironmentScenarioUpdate {
  status?: EnvironmentScenarioStatus;
  evidenciaArquivoUrl?: string | null;
}

export type EnvironmentBugStatus = 'aberto' | 'em_andamento' | 'resolvido';

export interface EnvironmentBug {
  id: string;
  scenarioId: string | null;
  title: string;
  description: string | null;
  status: EnvironmentBugStatus;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface CreateEnvironmentBugInput {
  scenarioId: string | null;
  title: string;
  description: string | null;
  status: EnvironmentBugStatus;
}

export type UpdateEnvironmentBugInput = Partial<Omit<EnvironmentBug, 'id'>>;

export interface ScenarioExecution {
  id: string;
  organizationId: string;
  storeId: string;
  environmentId: string;
  scenarioId: string;
  scenarioTitle: string;
  qaId: string | null;
  qaName: string | null;
  totalMs: number;
  executedAt: string;
  createdAt: string | null;
}

export interface CreateScenarioExecutionInput {
  organizationId: string;
  storeId: string;
  environmentId: string;
  scenarioId: string;
  scenarioTitle: string;
  qaId: string | null;
  qaName: string | null;
  totalMs: number;
  executedAt: string;
}

export type ActivityEntityType =
  | 'organization'
  | 'store'
  | 'scenario'
  | 'suite'
  | 'environment'
  | 'environment_bug'
  | 'environment_participant';

export interface ActivityLog {
  id: string;
  organizationId: string;
  entityId: string;
  entityType: ActivityEntityType;
  action: 'create' | 'update' | 'delete' | 'status_change' | 'attachment' | 'participation';
  message: string;
  actorId: string | null;
  actorName: string;
  createdAt: Date | null;
}

export interface ActivityLogInput {
  organizationId: string;
  entityId: string;
  entityType: ActivityEntityType;
  action: ActivityLog['action'];
  message: string;
  actor?: AuthUser | null;
}

export interface EnvironmentRealtimeFilters {
  storeId?: string;
}

export interface TransitionEnvironmentStatusParams {
  environment: Environment;
  targetStatus: EnvironmentStatus;
  currentUserId?: string | null;
}

export interface CreateOrganizationPayload {
  name: string;
  description: string;
  logoFile?: File | null;
}

export interface UpdateOrganizationPayload {
  name: string;
  description: string;
  logoFile?: File | null;
}

export interface AddUserToOrganizationPayload {
  organizationId: string;
  userEmail: string;
}

export interface RemoveUserFromOrganizationPayload {
  organizationId: string;
  userId: string;
}

export interface ScenarioAverageEntry {
  scenarioId: string | null;
  scenarioTitle: string;
  executions: number;
  averageMs: number;
  bestMs: number;
}

export type ScenarioAverageMap = Record<string, ScenarioAverageEntry>;

export interface EnvironmentSummaryAttendee {
  name: string;
  email: string;
}

export interface EnvironmentSummaryPayload {
  identifier?: string;
  totalTime?: string;
  totalTimeMs?: number;
  scenariosCount?: number;
  executedScenariosCount?: number;
  executedScenariosMessage?: string;
  fix?: {
    type?: 'bug' | 'storyfixes';
    value?: number;
  };
  jira?: string;
  suiteName?: string;
  suiteDetails?: string;
  participantsCount?: number;
  monitoredUrls?: string[];
  attendees?: Array<EnvironmentSummaryAttendee | string>;
}

export interface SlackTaskSummaryPayload {
  environmentSummary: EnvironmentSummaryPayload;
  message?: string;
}
