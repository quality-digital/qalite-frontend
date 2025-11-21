import { firebaseOrganizationRepository } from '../../infrastructure/repositories/firebaseOrganizationRepository';
import { OrganizationUseCases } from './organizationUseCases';

export const organizationUseCases = new OrganizationUseCases(firebaseOrganizationRepository);
export const organizationService = organizationUseCases;
