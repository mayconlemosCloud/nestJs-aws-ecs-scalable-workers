import { ApiRepository } from '../repositories/api.repository';

export class TransactionService {
  static async getHistory(userId: string) {
    return await ApiRepository.get(`/transactions?userId=${userId}`);
  }

  static async simulatePurchase(userId: string, amount: number) {
    const idempotencyKey = `buy-${Date.now()}-${amount}`;
    
    try {
      await ApiRepository.post('/transactions', { userId, amount, idempotencyKey });
      return { success: true };
    } catch (error: any) {
      if (error.status === 429) {
        return { success: false, reason: 'ATO_SUSPEITO' };
      }
      if (error.status === 409) {
        return { success: false, reason: 'DUPLICADA' };
      }
      return { success: false, reason: 'ERRO_DESCONHECIDO' };
    }
  }
}

