import type { Organization } from '../entities/Organization';
import type {
  IOrganizationRepository,
  UpdateOrganizationPayload
} from '../repositories/OrganizationRepository';

export class UpdateOrganization {
  constructor(private readonly organizationRepository: IOrganizationRepository) {}

  execute(id: string, payload: UpdateOrganizationPayload): Promise<Organization> {
    return this.organizationRepository.update(id, payload);
  }
}
