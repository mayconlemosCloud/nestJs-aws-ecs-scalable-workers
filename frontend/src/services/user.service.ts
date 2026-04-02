import { ApiRepository } from '../repositories/api.repository';

export class UserService {
  static async setupTestUser(creditLimit: number = 2000) {
    try {
      const user = await ApiRepository.post('/users', { creditLimit });
      return user;
    } catch (e) {
      throw new Error('Falha ao criar usuário de teste');
    }
  }

  static async getBalance(userId: string) {
    try {
      return await ApiRepository.get(`/users/${userId}/balance`);
    } catch (e) {
      throw new Error('Falha ao buscar saldo');
    }
  }
}
