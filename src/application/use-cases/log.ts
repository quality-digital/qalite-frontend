import { firebaseLogRepository } from '../../infrastructure/repositories/firebaseLogRepository';
import { LogUseCases } from './logUseCases';

export const logUseCases = new LogUseCases(firebaseLogRepository);
export const logService = logUseCases;
