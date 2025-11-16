import type { Organization, OrganizationMember } from '../../domain/entities/Organization';
import type {
  AddUserToOrganizationPayload,
  CreateOrganizationPayload,
  IOrganizationRepository,
  RemoveUserFromOrganizationPayload,
  UpdateOrganizationPayload,
} from '../../domain/repositories/OrganizationRepository';
import { AddUserToOrganization } from '../../domain/usecases/AddUserToOrganization';
import { CreateOrganization } from '../../domain/usecases/CreateOrganization';
import { DeleteOrganization } from '../../domain/usecases/DeleteOrganization';
import { GetOrganizationById } from '../../domain/usecases/GetOrganizationById';
import { GetUserOrganization } from '../../domain/usecases/GetUserOrganization';
import { ListOrganizations } from '../../domain/usecases/ListOrganizations';
import { RemoveUserFromOrganization } from '../../domain/usecases/RemoveUserFromOrganization';
import { UpdateOrganization } from '../../domain/usecases/UpdateOrganization';

export class OrganizationService {
  private readonly listOrganizations: ListOrganizations;
  private readonly getOrganizationById: GetOrganizationById;
  private readonly createOrganization: CreateOrganization;
  private readonly updateOrganization: UpdateOrganization;
  private readonly deleteOrganization: DeleteOrganization;
  private readonly addUserToOrganization: AddUserToOrganization;
  private readonly removeUserFromOrganization: RemoveUserFromOrganization;
  private readonly getUserOrganization: GetUserOrganization;

  constructor(repository: IOrganizationRepository) {
    this.listOrganizations = new ListOrganizations(repository);
    this.getOrganizationById = new GetOrganizationById(repository);
    this.createOrganization = new CreateOrganization(repository);
    this.updateOrganization = new UpdateOrganization(repository);
    this.deleteOrganization = new DeleteOrganization(repository);
    this.addUserToOrganization = new AddUserToOrganization(repository);
    this.removeUserFromOrganization = new RemoveUserFromOrganization(repository);
    this.getUserOrganization = new GetUserOrganization(repository);
  }

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
