import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
} from '@nestjs/common';
import { Cookie } from '../../../common/decorators/cookie.decorator.js';
import { CurrentUser } from '../../../common/decorators/current-user.decorator.js';
import { ResponseMessage } from '../../../common/decorators/response-message.decorator.js';
import type { AuthUser } from '../../auth/types/auth.types.js';
import {
  createTenantSchema,
  type CreateTenantType,
} from '../dto/tenant.dto.js';
import { TenantsService } from './tenants.service.js';

@Controller('tenants')
export class TenantsController {
  constructor(private readonly tenantService: TenantsService) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  @ResponseMessage('Tenant Saved Successfully')
  async createTenants(
    @Body({ schema: createTenantSchema }) dto: CreateTenantType,
    @Cookie('role_id') cookieRoleId?: string,
    @CurrentUser() user?: AuthUser,
  ) {
    const roleId = user?.roleId ?? cookieRoleId;
    const result = await this.tenantService.createTenant(dto, roleId ?? undefined);

    return result;
  }
}
