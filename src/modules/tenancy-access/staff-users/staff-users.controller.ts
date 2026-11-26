import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Query,
} from '@nestjs/common';
import { CurrentUser } from '../../../common/decorators/current-user.decorator.js';
import { ResponseMessage } from '../../../common/decorators/response-message.decorator.js';
import type { AuthUser } from '../../auth/types/auth.types.js';
import {
  createStaffUserSchema,
  staffUserListQuerySchema,
  type CreateStaffUserSchema,
  type StaffUserListQuerySchema,
} from '../dto/staff-user.dto.js';
import { StaffUsersService } from './staff-users.service.js';

@Controller('staff-users')
export class StaffUsersController {
  constructor(private readonly staffUsersService: StaffUsersService) {}

  @Get()
  @ResponseMessage('Staff users retrieved successfully')
  async getStaffUsers(
    @Query({ schema: staffUserListQuerySchema })
    query: StaffUserListQuerySchema,
    @CurrentUser() user: AuthUser,
  ) {
    return this.staffUsersService.getStaffUsers(query, user);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ResponseMessage('Staff user created successfully')
  async createStaffUser(
    @Body({ schema: createStaffUserSchema }) payload: CreateStaffUserSchema,
    @CurrentUser() user: AuthUser,
  ) {
    return this.staffUsersService.createStaffUser(payload, user.id);
  }
}
