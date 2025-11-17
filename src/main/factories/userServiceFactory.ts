import { UserService } from '../../application/services/UserService';
import { FirebaseUserRepository } from '../../infra/repositories/FirebaseUserRepository';

const userRepository = new FirebaseUserRepository();

export const userService = new UserService(userRepository);
