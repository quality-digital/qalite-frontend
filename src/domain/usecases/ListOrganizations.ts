import type { Organization } from '../entities/Organization';
import type { IOrganizationRepository } from '../repositories/OrganizationRepository';

export class ListOrganizations {
  constructor(private readonly organizationRepository: IOrganizationRepository) {}

  execute(): Promise<Organization[]> {
    return this.organizationRepository.list();
  }
}
