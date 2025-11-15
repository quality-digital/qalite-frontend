import type { Store } from '../entities/Store';
import type { IStoreRepository } from '../repositories/StoreRepository';

export class ListStoresByOrganization {
  constructor(private readonly storeRepository: IStoreRepository) {}

  execute(organizationId: string): Promise<Store[]> {
    return this.storeRepository.listByOrganization(organizationId);
  }
}
