import type {
  AddUserToOrganizationPayload,
  CreateOrganizationPayload,
  Organization,
  OrganizationMember,
  RemoveUserFromOrganizationPayload,
  UpdateOrganizationPayload,
} from '../entities/types';

export interface OrganizationRepository {
  list: () => Promise<Organization[]>;
  getById: (id: string) => Promise<Organization | null>;
  create: (organization: CreateOrganizationPayload) => Promise<Organization>;
  update: (id: string, organization: UpdateOrganizationPayload) => Promise<Organization>;
  delete: (id: string) => Promise<void>;
  addUser: (payload: AddUserToOrganizationPayload) => Promise<OrganizationMember>;
  removeUser: (payload: RemoveUserFromOrganizationPayload) => Promise<void>;
  getUserOrganizationByUserId: (userId: string) => Promise<Organization | null>;
}
