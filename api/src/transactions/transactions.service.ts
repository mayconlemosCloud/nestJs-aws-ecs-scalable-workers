import { Injectable, InternalServerErrorException, Inject, HttpException, HttpStatus } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Transaction } from './entities/transaction.entity';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { REDIS_CLIENT } from '../common/redis/redis.module';
import Redis from 'ioredis';

@Injectable()
export class TransactionsService {
  constructor(
    @InjectRepository(Transaction)
    private readonly transactionRepository: Repository<Transaction>,
    private readonly dataSource: DataSource,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
  ) {}

  async create(createTransactionDto: CreateTransactionDto): Promise<Transaction> {
    const { userId, amount, idempotencyKey } = createTransactionDto;

    // --- ETAPA 6: ANTIFRAUDE (Lock Temporário de 2s no Redis) ---
    const lockKey = `lock:transaction:user:${userId}`;
    // NX = Only set if not exists | EX = Expire in 2 seconds
    const locked = await this.redis.set(lockKey, 'LOCKED', 'EX', 2, 'NX');
    
    if (!locked) {
      throw new HttpException(
        'Ato suspeito. Múltiplas transações em intervalo curto não permitidas.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    return await this.dataSource.transaction(async (entityManager) => {
      // --- ETAPA 5.1: CORREÇÃO DO SALDO (Update Atômico Preciso) ---
      const updateQuery = `
        UPDATE users 
        SET used_limit = used_limit + $1 
        WHERE id = $2 
          AND status = 'ACTIVE' 
          AND (credit_limit - used_limit) >= $1 
        RETURNING id;
      `;

      const updateResult = await entityManager.query(updateQuery, [amount, userId]);

      // No TypeORM/PG, o UPDATE RETURNING pode retornar [[rows], affectedCount] ou [rows].
      // Vamos checar de forma robusta se alguma linha contendo o "id" foi retornada.
      const rows = Array.isArray(updateResult[0]) ? updateResult[0] : updateResult;
      const status = rows.length > 0 && rows[0]?.id ? 'APPROVED' : 'REJECTED';


      const transaction = entityManager.create(Transaction, {
        userId,
        amount,
        status,
        idempotencyKey,
      });

      return await entityManager.save(transaction);
    });
  }

  async findAll(userId?: string) {
    const where = userId ? { userId } : {};
    return this.transactionRepository.find({ where, order: { createdAt: 'DESC' } });
  }
}



