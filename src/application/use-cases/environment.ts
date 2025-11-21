import { firebaseEnvironmentRepository } from '../../infrastructure/repositories/firebaseEnvironmentRepository';
import { EnvironmentUseCases } from './environmentUseCases';

export const environmentUseCases = new EnvironmentUseCases(firebaseEnvironmentRepository);
export const environmentService = environmentUseCases;
