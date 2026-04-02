import { Controller, Post, Body, Get, UseFilters, HttpCode, UseGuards, Query } from '@nestjs/common';
import { TransactionsService } from './transactions.service';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { DatabaseExceptionFilter } from '../common/filters/database-exception.filter';
import { ThrottlerGuard } from '@nestjs/throttler';

@Controller('transactions')
@UseFilters(DatabaseExceptionFilter) // Captura Idempotency Conflict
@UseGuards(ThrottlerGuard) // Proteção Rate Limit IP
export class TransactionsController {

  constructor(private readonly transactionsService: TransactionsService) {}

  @Post()
  @HttpCode(201)
  create(@Body() createTransactionDto: CreateTransactionDto) {
    return this.transactionsService.create(createTransactionDto);
  }

  @Get()
  findAll(@Query('userId') userId?: string) {
    return this.transactionsService.findAll(userId);
  }
}
