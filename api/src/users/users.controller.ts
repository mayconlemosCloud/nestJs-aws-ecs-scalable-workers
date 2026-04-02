import { Controller, Get, Param, ParseUUIDPipe, Post, Body } from '@nestjs/common';
import { UsersService } from './users.service';
import { User } from './entities/user.entity';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  create(@Body() data: Partial<User>) {
    return this.usersService.create(data);
  }

  @Get(':id/balance')

  getBalance(@Param('id', ParseUUIDPipe) id: string) {
    return this.usersService.getBalance(id);
  }
}
