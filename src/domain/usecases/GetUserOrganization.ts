import type { Organization } from '../entities/Organization';
import type { IOrganizationRepository } from '../repositories/OrganizationRepository';

export class GetUserOrganization {
  constructor(private readonly organizationRepository: IOrganizationRepository) {}

  execute(userId: string): Promise<Organization | null> {
    return this.organizationRepository.getUserOrganization(userId);
  }
}
