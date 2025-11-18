import type { Organization, OrganizationMember } from '../../domain/entities/Organization';
import type {
  AddUserToOrganizationPayload,
  CreateOrganizationPayload,
  IOrganizationRepository,
  RemoveUserFromOrganizationPayload,
  UpdateOrganizationPayload,
} from '../../domain/repositories/OrganizationRepository';

export class OrganizationService {
  constructor(private readonly repository: IOrganizationRepository) {}

  list(): Promise<Organization[]> {
    return this.repository.list();
  }

  getById(id: string): Promise<Organization | null> {
    return this.repository.getById(id);
  }

  create(payload: CreateOrganizationPayload): Promise<Organization> {
    return this.repository.create(payload);
  }

  update(id: string, payload: UpdateOrganizationPayload): Promise<Organization> {
    return this.repository.update(id, payload);
  }

  delete(id: string): Promise<void> {
    return this.repository.delete(id);
  }

  addUser(payload: AddUserToOrganizationPayload): Promise<OrganizationMember> {
    return this.repository.addUserByEmail(payload);
  }

  removeUser(payload: RemoveUserFromOrganizationPayload): Promise<void> {
    return this.repository.removeUser(payload);
  }

  getUserOrganizationByUserId(userId: string): Promise<Organization | null> {
    return this.repository.getUserOrganization(userId);
  }
}
