import type { OrganizationRepository } from '../../domain/repositories/OrganizationRepository';
import type {
  AddUserToOrganizationDTO,
  CreateOrganizationDTO,
  OrganizationDTO,
  OrganizationMemberDTO,
  RemoveUserFromOrganizationDTO,
  UpdateOrganizationDTO,
} from '../dto/OrganizationDto';
import { firebaseOrganizationRepository } from '../../infrastructure/repositories/firebaseOrganizationRepository';

export class OrganizationUseCases {
  constructor(private readonly organizationRepository: OrganizationRepository) {}

  list(): Promise<OrganizationDTO[]> {
    return this.organizationRepository.list();
  }

  getById(id: string): Promise<OrganizationDTO | null> {
    return this.organizationRepository.getById(id);
  }

  create(organization: CreateOrganizationDTO): Promise<OrganizationDTO> {
    return this.organizationRepository.create(organization);
  }

  update(id: string, organization: UpdateOrganizationDTO): Promise<OrganizationDTO> {
    return this.organizationRepository.update(id, organization);
  }

  delete(id: string): Promise<void> {
    return this.organizationRepository.delete(id);
  }

  addUser(payload: AddUserToOrganizationDTO): Promise<OrganizationMemberDTO> {
    return this.organizationRepository.addUser(payload);
  }

  removeUser(payload: RemoveUserFromOrganizationDTO): Promise<void> {
    return this.organizationRepository.removeUser(payload);
  }

  getUserOrganizationByUserId(userId: string): Promise<OrganizationDTO | null> {
    return this.organizationRepository.getUserOrganizationByUserId(userId);
  }
}

export const organizationUseCases = new OrganizationUseCases(firebaseOrganizationRepository);
export const organizationService = organizationUseCases;
