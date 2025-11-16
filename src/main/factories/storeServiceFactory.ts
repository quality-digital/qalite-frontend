import { StoreService } from '../../application/services/StoreService';
import { FirebaseStoreRepository } from '../../infra/repositories/FirebaseStoreRepository';

const storeRepository = new FirebaseStoreRepository();

export const storeService = new StoreService(storeRepository);
