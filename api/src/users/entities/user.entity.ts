import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from 'typeorm';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', default: 'ACTIVE' })
  status: string;

  @Column({ name: 'credit_limit', type: 'numeric', precision: 10, scale: 2 })
  creditLimit: number;

  @Column({
    name: 'used_limit',
    type: 'numeric',
    precision: 10,
    scale: 2,
    default: 0,
  })
  usedLimit: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
