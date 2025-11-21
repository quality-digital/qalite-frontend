import { firebaseStoreRepository } from '../../infrastructure/repositories/firebaseStoreRepository';
import { StoreUseCases } from './storeUseCases';

export const storeUseCases = new StoreUseCases(firebaseStoreRepository);
export const storeService = storeUseCases;
