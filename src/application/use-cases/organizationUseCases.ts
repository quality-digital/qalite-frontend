import type { OrganizationRepository } from '../../domain/repositories/OrganizationRepository';
import type {
  AddUserToOrganizationPayload,
  CreateOrganizationPayload,
  Organization,
  OrganizationMember,
  RemoveUserFromOrganizationPayload,
  UpdateOrganizationPayload,
} from '../../domain/entities/organization';

export class OrganizationUseCases {
  constructor(private readonly organizationRepository: OrganizationRepository) {}

  list(): Promise<Organization[]> {
    return this.organizationRepository.list();
  }

  getById(id: string): Promise<Organization | null> {
    return this.organizationRepository.getById(id);
  }

  create(organization: CreateOrganizationPayload): Promise<Organization> {
    return this.organizationRepository.create(organization);
  }

  update(id: string, organization: UpdateOrganizationPayload): Promise<Organization> {
    return this.organizationRepository.update(id, organization);
  }

  delete(id: string): Promise<void> {
    return this.organizationRepository.delete(id);
  }

  addUser(payload: AddUserToOrganizationPayload): Promise<OrganizationMember> {
    return this.organizationRepository.addUser(payload);
  }

  removeUser(payload: RemoveUserFromOrganizationPayload): Promise<void> {
    return this.organizationRepository.removeUser(payload);
  }

  getUserOrganizationByUserId(userId: string): Promise<Organization | null> {
    return this.organizationRepository.getUserOrganizationByUserId(userId);
  }
}
