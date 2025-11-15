import type { Organization, OrganizationMember } from '../../domain/entities/Organization';
import { AddUserToOrganization } from '../../domain/usecases/AddUserToOrganization';
import { CreateOrganization } from '../../domain/usecases/CreateOrganization';
import { DeleteOrganization } from '../../domain/usecases/DeleteOrganization';
import { GetOrganizationById } from '../../domain/usecases/GetOrganizationById';
import { GetUserOrganization } from '../../domain/usecases/GetUserOrganization';
import { ListOrganizations } from '../../domain/usecases/ListOrganizations';
import { RemoveUserFromOrganization } from '../../domain/usecases/RemoveUserFromOrganization';
import { UpdateOrganization } from '../../domain/usecases/UpdateOrganization';
import type {
  AddUserToOrganizationPayload,
  CreateOrganizationPayload,
  RemoveUserFromOrganizationPayload,
  UpdateOrganizationPayload
} from '../../domain/repositories/OrganizationRepository';
import { FirebaseOrganizationRepository } from '../../infra/repositories/FirebaseOrganizationRepository';

const organizationRepository = new FirebaseOrganizationRepository();

export class OrganizationService {
  private readonly listOrganizations = new ListOrganizations(organizationRepository);
  private readonly getOrganizationById = new GetOrganizationById(organizationRepository);
  private readonly createOrganization = new CreateOrganization(organizationRepository);
  private readonly updateOrganization = new UpdateOrganization(organizationRepository);
  private readonly deleteOrganization = new DeleteOrganization(organizationRepository);
  private readonly addUserToOrganization = new AddUserToOrganization(organizationRepository);
  private readonly removeUserFromOrganization = new RemoveUserFromOrganization(organizationRepository);
  private readonly getUserOrganization = new GetUserOrganization(organizationRepository);

  list(): Promise<Organization[]> {
    return this.listOrganizations.execute();
  }

  getById(id: string): Promise<Organization | null> {
    return this.getOrganizationById.execute(id);
  }

  create(payload: CreateOrganizationPayload): Promise<Organization> {
    return this.createOrganization.execute(payload);
  }

  update(id: string, payload: UpdateOrganizationPayload): Promise<Organization> {
    return this.updateOrganization.execute(id, payload);
  }

  delete(id: string): Promise<void> {
    return this.deleteOrganization.execute(id);
  }

  addUser(payload: AddUserToOrganizationPayload): Promise<OrganizationMember> {
    return this.addUserToOrganization.execute(payload);
  }

  removeUser(payload: RemoveUserFromOrganizationPayload): Promise<void> {
    return this.removeUserFromOrganization.execute(payload);
  }

  getUserOrganizationByUserId(userId: string): Promise<Organization | null> {
    return this.getUserOrganization.execute(userId);
  }
}

export const organizationService = new OrganizationService();
