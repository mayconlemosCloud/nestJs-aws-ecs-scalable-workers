import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async findById(id: string): Promise<User> {
    const user = await this.userRepository.findOne({ where: { id } });
    if (!user) {
      throw new NotFoundException(`Usuário ${id} não encontrado`);
    }
    return user;
  }

  async getBalance(id: string) {
    const user = await this.findById(id);
    return {
      userId: user.id,
      creditLimit: Number(user.creditLimit),
      usedLimit: Number(user.usedLimit),
      availableLimit: Number(user.creditLimit) - Number(user.usedLimit),
      status: user.status,
    };
  }

  // Método auxiliar para criar usuários de teste inicialmente
  async create(data: Partial<User>): Promise<User> {
    const user = this.userRepository.create(data);
    return this.userRepository.save(user);
  }
}
