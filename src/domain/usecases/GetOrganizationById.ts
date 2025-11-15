import type { Organization } from '../entities/Organization';
import type { IOrganizationRepository } from '../repositories/OrganizationRepository';

export class GetOrganizationById {
  constructor(private readonly organizationRepository: IOrganizationRepository) {}

  execute(id: string): Promise<Organization | null> {
    return this.organizationRepository.getById(id);
  }
}
