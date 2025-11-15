import type { Organization } from '../entities/Organization';
import type { CreateOrganizationPayload, IOrganizationRepository } from '../repositories/OrganizationRepository';

export class CreateOrganization {
  constructor(private readonly organizationRepository: IOrganizationRepository) {}

  execute(payload: CreateOrganizationPayload): Promise<Organization> {
    return this.organizationRepository.create(payload);
  }
}
