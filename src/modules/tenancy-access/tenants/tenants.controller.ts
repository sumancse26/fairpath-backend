import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { Cookie } from '../../../common/decorators/cookie.decorator.js';
import { ResponseMessage } from '../../../common/decorators/response-message.decorator.js';
import {
  createTenantSchema,
  tenantListQuerySchema,
  updateTenantSchema,
  type CreateTenantType,
  type TenantListQueryType,
  type UpdateTenantType,
} from '../dto/tenant.dto.js';
import { TenantsService } from './tenants.service.js';

@Controller('tenants')
export class TenantsController {
  constructor(private readonly tenantService: TenantsService) {}

  @Post()
  @HttpCode(HttpStatus.OK)
  @ResponseMessage('Tenant Saved Successfully')
  async createTenants(
    @Body({ schema: createTenantSchema }) payload: CreateTenantType,
    @Cookie('role_id') cookieRoleId?: string,
  ) {
    const roleId = cookieRoleId;

    return this.tenantService.createTenant(payload, roleId);
  }

  @Get()
  @ResponseMessage('Tenants retrieved successfully')
  async getTenants(
    @Query({ schema: tenantListQuerySchema }) query: TenantListQueryType,
  ) {
    return this.tenantService.getTenants(query);
  }

  @Put(':id')
  @HttpCode(HttpStatus.OK)
  @ResponseMessage('Tenant Updated Successfully')
  async updateTenants(
    @Param('id') id: string,
    @Body({ schema: updateTenantSchema }) payload: UpdateTenantType,
    @Cookie('role_id') cookieRoleId?: string,
  ) {
    const roleId = cookieRoleId;

    return this.tenantService.updateTenant(payload, roleId, id);
  }

  @Get(':id')
  @HttpCode(HttpStatus.OK)
  @ResponseMessage('Tenant Details')
  async getTenantDetails(
    @Param('id') id: string,
    @Cookie('user_id') cookieUserId: string,
  ) {
    const userId = Number(cookieUserId);

    return this.tenantService.getTenantDetails(userId, Number(id));
  }
}
