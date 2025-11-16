import { OrganizationService } from '../../application/services/OrganizationService';
import { FirebaseOrganizationRepository } from '../../infra/repositories/FirebaseOrganizationRepository';

const organizationRepository = new FirebaseOrganizationRepository();

export const organizationService = new OrganizationService(organizationRepository);
