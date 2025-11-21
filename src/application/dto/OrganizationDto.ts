import type {
  AddUserToOrganizationPayload,
  CreateOrganizationPayload,
  Organization,
  OrganizationMember,
  RemoveUserFromOrganizationPayload,
  UpdateOrganizationPayload,
} from '../../domain/entities/organization';

export type OrganizationDTO = Organization;
export type OrganizationMemberDTO = OrganizationMember;

export type CreateOrganizationDTO = CreateOrganizationPayload;
export type UpdateOrganizationDTO = UpdateOrganizationPayload;
export type AddUserToOrganizationDTO = AddUserToOrganizationPayload;
export type RemoveUserFromOrganizationDTO = RemoveUserFromOrganizationPayload;
