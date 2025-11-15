import type {
  IOrganizationRepository,
  RemoveUserFromOrganizationPayload
} from '../repositories/OrganizationRepository';

export class RemoveUserFromOrganization {
  constructor(private readonly organizationRepository: IOrganizationRepository) {}

  execute(payload: RemoveUserFromOrganizationPayload): Promise<void> {
    return this.organizationRepository.removeUser(payload);
  }
}
