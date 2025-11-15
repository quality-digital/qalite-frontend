import type { Organization, OrganizationMember } from '../entities/Organization';

export interface CreateOrganizationPayload {
  name: string;
  description: string;
}

export interface UpdateOrganizationPayload {
  name: string;
  description: string;
}

export interface AddUserToOrganizationPayload {
  organizationId: string;
  userEmail: string;
}

export interface RemoveUserFromOrganizationPayload {
  organizationId: string;
  userId: string;
}

export interface IOrganizationRepository {
  list(): Promise<Organization[]>;
  getById(id: string): Promise<Organization | null>;
  create(payload: CreateOrganizationPayload): Promise<Organization>;
  update(id: string, payload: UpdateOrganizationPayload): Promise<Organization>;
  delete(id: string): Promise<void>;
  addUserByEmail(payload: AddUserToOrganizationPayload): Promise<OrganizationMember>;
  removeUser(payload: RemoveUserFromOrganizationPayload): Promise<void>;
  getUserOrganization(userId: string): Promise<Organization | null>;
}
