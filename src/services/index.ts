import { AuthService } from '../application/services/AuthService';
import { EnvironmentService } from '../application/services/EnvironmentService';
import { OrganizationService } from '../application/services/OrganizationService';
import { StoreService } from '../application/services/StoreService';
import { UserService } from '../application/services/UserService';
import { FirebaseAuthRepository } from '../infra/repositories/FirebaseAuthRepository';
import { FirebaseEnvironmentRepository } from '../infra/repositories/FirebaseEnvironmentRepository';
import { FirebaseOrganizationRepository } from '../infra/repositories/FirebaseOrganizationRepository';
import { FirebaseStoreRepository } from '../infra/repositories/FirebaseStoreRepository';
import { FirebaseUserRepository } from '../infra/repositories/FirebaseUserRepository';
import { BrowserEnvironmentExporter } from '../infra/services/BrowserEnvironmentExporter';

const authRepository = new FirebaseAuthRepository();
const environmentRepository = new FirebaseEnvironmentRepository();
const organizationRepository = new FirebaseOrganizationRepository();
const storeRepository = new FirebaseStoreRepository();
const userRepository = new FirebaseUserRepository();
const environmentExporter = new BrowserEnvironmentExporter();

export const authService = new AuthService(authRepository);
export const environmentService = new EnvironmentService(
  environmentRepository,
  environmentExporter,
);
export const organizationService = new OrganizationService(organizationRepository);
export const storeService = new StoreService(storeRepository);
export const userService = new UserService(userRepository);
