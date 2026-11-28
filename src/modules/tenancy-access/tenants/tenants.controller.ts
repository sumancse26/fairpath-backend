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
import { CurrentUser } from '../../../common/decorators/current-user.decorator.js';
import { ResponseMessage } from '../../../common/decorators/response-message.decorator.js';
import type { AuthUser } from '../../auth/types/auth.types.js';
import {
  agentListQuerySchema,
  branchListQuerySchema,
  createAgentSchema,
  createBranchSchema,
  createTenantSchema,
  tenantListQuerySchema,
  updateTenantSchema,
  type AgentListQueryType,
  type BranchListQueryType,
  type CreateAgentType,
  type CreateBranchType,
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
    @Cookie('role_id') cookieRoleId?: string,
    @CurrentUser() user?: AuthUser,
  ) {
    const roleId = user?.roleId ?? cookieRoleId;
    return this.tenantService.getTenants(query, roleId, user);
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

  @Post('branches')
  @HttpCode(HttpStatus.CREATED)
  @ResponseMessage('Branch created successfully')
  async createBranch(
    @Body({ schema: createBranchSchema }) payload: CreateBranchType,
    @Cookie('tenant_id') cookieTenantId?: string,
    @CurrentUser() user?: AuthUser,
  ) {
    return this.tenantService.createBranch(payload, cookieTenantId, user);
  }

  @Get('branches')
  @ResponseMessage('Branches retrieved successfully')
  async getBranches(
    @Query({ schema: branchListQuerySchema }) query: BranchListQueryType,
    @Cookie('tenant_id') cookieTenantId?: string,
    @CurrentUser() user?: AuthUser,
  ) {
    return this.tenantService.getBranches(query, cookieTenantId, user);
  }

  @Post('agents')
  @HttpCode(HttpStatus.OK)
  @ResponseMessage('Agent saved successfully')
  async createAgent(
    @Body({ schema: createAgentSchema }) payload: CreateAgentType,
    @Cookie('tenant_id') cookieTenantId?: string,
    @CurrentUser() user?: AuthUser,
  ) {
    return this.tenantService.createAgent(payload, cookieTenantId, user);
  }

  @Get('agents')
  @ResponseMessage('Agents retrieved successfully')
  async getAgents(
    @Query({ schema: agentListQuerySchema }) query: AgentListQueryType,
    @Cookie('tenant_id') cookieTenantId?: string,
    @CurrentUser() user?: AuthUser,
  ) {
    return this.tenantService.getAgents(query, cookieTenantId, user);
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
