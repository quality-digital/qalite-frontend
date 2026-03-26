import type { OrganizationRepository } from '../../domain/repositories/OrganizationRepository';
import {
  addUserToOrganization,
  approveOrganizationAccessRequest,
  cancelOrganizationAccessRequest,
  createOrganization,
  deleteOrganization,
  getOrganizationDetail,
  getUserOrganization,
  listOrganizationsSummary,
  requestOrganizationAccess,
  removeUserFromOrganization,
  updateOrganization,
  uploadOrganizationLogo,
} from '../external/organizations';

export const firebaseOrganizationRepository: OrganizationRepository = {
  list: listOrganizationsSummary,
  getById: getOrganizationDetail,
  listSummary: listOrganizationsSummary,
  getDetail: getOrganizationDetail,
  create: createOrganization,
  update: updateOrganization,
  uploadLogo: uploadOrganizationLogo,
  delete: deleteOrganization,
  addUser: addUserToOrganization,
  removeUser: removeUserFromOrganization,
  requestAccess: requestOrganizationAccess,
  cancelAccessRequest: cancelOrganizationAccessRequest,
  approveAccessRequest: approveOrganizationAccessRequest,
  getUserOrganizationByUserId: getUserOrganization,
};
