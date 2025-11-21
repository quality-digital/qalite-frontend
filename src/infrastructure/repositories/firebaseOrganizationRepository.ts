import type { OrganizationRepository } from '../../domain/repositories/OrganizationRepository';
import {
  addUserToOrganization,
  createOrganization,
  deleteOrganization,
  getOrganization,
  getUserOrganization,
  listOrganizations,
  removeUserFromOrganization,
  updateOrganization,
} from '../external/organizations';

export const firebaseOrganizationRepository: OrganizationRepository = {
  list: listOrganizations,
  getById: getOrganization,
  create: createOrganization,
  update: updateOrganization,
  delete: deleteOrganization,
  addUser: addUserToOrganization,
  removeUser: removeUserFromOrganization,
  getUserOrganizationByUserId: getUserOrganization,
};
