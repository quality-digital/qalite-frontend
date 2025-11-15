import type { IOrganizationRepository } from '../repositories/OrganizationRepository';

export class DeleteOrganization {
  constructor(private readonly organizationRepository: IOrganizationRepository) {}

  execute(id: string): Promise<void> {
    return this.organizationRepository.delete(id);
  }
}
