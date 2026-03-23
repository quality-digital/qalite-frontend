import type {
  AddUserToOrganizationPayload,
  CancelOrganizationAccessRequestPayload,
  CreateOrganizationPayload,
  Organization,
  OrganizationAccessRequest,
  OrganizationMember,
  RemoveUserFromOrganizationPayload,
  RequestOrganizationAccessPayload,
  UpdateOrganizationPayload,
} from '../entities/organization';

export interface OrganizationRepository {
  list: () => Promise<Organization[]>;
  getById: (id: string) => Promise<Organization | null>;
  listSummary: () => Promise<Organization[]>;
  getDetail: (id: string) => Promise<Organization | null>;
  create: (organization: CreateOrganizationPayload) => Promise<Organization>;
  update: (id: string, organization: UpdateOrganizationPayload) => Promise<Organization>;
  uploadLogo: (organizationId: string, file: File) => Promise<string>;
  delete: (id: string) => Promise<void>;
  addUser: (payload: AddUserToOrganizationPayload) => Promise<OrganizationMember>;
  removeUser: (payload: RemoveUserFromOrganizationPayload) => Promise<void>;
  requestAccess: (payload: RequestOrganizationAccessPayload) => Promise<OrganizationAccessRequest>;
  cancelAccessRequest: (payload: CancelOrganizationAccessRequestPayload) => Promise<void>;
  approveAccessRequest: (payload: {
    organizationId: string;
    requestId: string;
  }) => Promise<OrganizationMember>;
  getUserOrganizationByUserId: (userId: string) => Promise<Organization | null>;
}
