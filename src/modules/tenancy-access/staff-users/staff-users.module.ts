import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../../database/database.module.js';
import { StaffUsersService } from './staff-users.service.js';
import { StaffUsersController } from './staff-users.controller.js';

@Module({
  imports: [DatabaseModule],
  providers: [StaffUsersService],
  controllers: [StaffUsersController],
})
export class StaffUsersModule {}
