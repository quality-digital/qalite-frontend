import type { OrganizationMember } from '../entities/Organization';
import type {
  AddUserToOrganizationPayload,
  IOrganizationRepository
} from '../repositories/OrganizationRepository';

export class AddUserToOrganization {
  constructor(private readonly organizationRepository: IOrganizationRepository) {}

  execute(payload: AddUserToOrganizationPayload): Promise<OrganizationMember> {
    return this.organizationRepository.addUserByEmail(payload);
  }
}
