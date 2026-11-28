import { randomBytes } from 'node:crypto';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import type {
  AgentListQueryType,
  BranchListQueryType,
  CreateAgentType,
  CreateBranchType,
  CreateTenantType,
  TenantListQueryType,
  UpdateTenantType,
} from '../dto/tenant.dto.js';
import type { AuthUser } from '../../auth/types/auth.types.js';
import { DatabaseService } from '../../../database/database.service.js';

@Injectable()
export class TenantsService {
  constructor(private readonly db: DatabaseService) {}

  async createTenant(payload: CreateTenantType, roleId?: string) {
    // --- Auth: role must exist and be a platform-level system role ---
    if (!roleId) throw new UnauthorizedException('Authentication required');

    const role = await this.db.role.findUnique({
      where: { id: BigInt(roleId) },
    });
    if (!role || !role.isSystem || role.tenantId !== null) {
      throw new ForbiddenException(
        'Only platform Super Admins can create tenants',
      );
    }

    // --- Validate plan ---
    const plan = await this.db.plan.findUnique({
      where: { id: BigInt(payload.plan_id) },
    });
    if (!plan) throw new NotFoundException(`Plan ${payload.plan_id} not found`);

    // --- Normalize inputs ---
    const name = payload.name.trim();
    const domain = payload.domain?.trim() || null;

    // --- Check uniqueness ---
    const existing = await this.db.tenant.findFirst({
      where: {
        OR: [
          { name: { equals: name, mode: 'insensitive' as const } },
          ...(domain
            ? [{ domain: { equals: domain, mode: 'insensitive' as const } }]
            : []),
        ],
      },
    });
    if (existing) {
      const field =
        existing.name.toLowerCase() === name.toLowerCase() ? 'name' : 'domain';
      throw new ConflictException(`Tenant with this ${field} already exists`);
    }

    // --- Resolve status and payment model from lookup table ---
    const [tenantStatusMst, paymentModelMst] = await Promise.all([
      this.db.lookupMst.findUnique({ where: { id: 1 } }),
      this.db.lookupMst.findUnique({
        where: { id: 2 },
      }),
    ]);

    if (!tenantStatusMst)
      throw new NotFoundException('Lookup group TENANT_STATUS not found');
    if (!paymentModelMst)
      throw new NotFoundException('Lookup group PAYMENT_MODEL not found');

    const [statusDtl, paymentModelDtl] = await Promise.all([
      this.db.lookupDtl.findFirst({
        where: { lookupMstId: tenantStatusMst.id, code: 'APPLIED' },
      }),
      this.db.lookupDtl.findFirst({
        where: { lookupMstId: paymentModelMst.id, code: 'PLATFORM_COLLECT' },
      }),
    ]);

    if (!statusDtl)
      throw new NotFoundException('Lookup TENANT_STATUS.APPLIED not found');
    if (!paymentModelDtl)
      throw new NotFoundException(
        'Lookup PAYMENT_MODEL.TENANT_COLLECT not found',
      );

    // --- Create tenant ---
    const tenant = await this.db.tenant.create({
      data: {
        planId: plan.id,
        name,
        domain,
        statusId: statusDtl.id,
        paymentModelId: paymentModelDtl.id,
      },
    });

    return {
      id: tenant.id.toString(),
      planId: tenant.planId.toString(),
      name: tenant.name,
    };
  }

  async getTenants(
    query: TenantListQueryType,
    roleId?: string,
    user?: AuthUser,
  ) {
    await this.assertSuperAdmin(
      roleId,
      user,
      'Only platform Super Admins can view tenants',
    );

    const page = query.page || 1;
    const limit = query.limit || 10;
    const skip = (page - 1) * limit;

    const where: {
      statusId?: bigint;
      status?: { code: string };
    } = {};

    if (query.status) {
      const trimmed = query.status.trim();
      if (/^\d+$/.test(trimmed)) {
        where.statusId = BigInt(trimmed);
      } else {
        where.status = { code: trimmed.toUpperCase() };
      }
    }

    const orderBy = this.parseSort(query.sort);

    const [total, tenants] = await Promise.all([
      this.db.tenant.count({ where }),
      this.db.tenant.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          status: { select: { code: true } },
          paymentModel: { select: { code: true } },
        },
      }),
    ]);

    const pages = Math.ceil(total / limit) || 1;

    const data = tenants.map((t) => ({
      id: Number(t.id),
      plan_id: Number(t.planId),
      name: t.name,
      status: t.status.code,
      payment_model: t.paymentModel.code,
      domain: t.domain,
      created_at: t.createdAt.toISOString(),
      updated_at: t.updatedAt.toISOString(),
      version: t.version,
    }));

    return {
      data,
      meta: {
        total,
        page,
        limit,
        pages,
      },
    };
  }

  async updateTenant(
    payload: UpdateTenantType,
    roleId: string | undefined,
    tenantIdParam: string,
  ) {
    // --- Auth: role must exist and be a platform-level system role ---
    if (!roleId) throw new UnauthorizedException('Authentication required');

    const role = await this.db.role.findUnique({
      where: { id: BigInt(roleId) },
    });
    if (!role || !role.isSystem || role.tenantId !== null) {
      throw new ForbiddenException(
        'Only platform Super Admins can update tenants',
      );
    }

    const tenantId = BigInt(tenantIdParam);
    const statusId = BigInt(payload.status_id);
    const paymentModelId = BigInt(payload.payment_model_id);

    const tenantExists = await this.db.tenant.findUnique({
      where: { id: tenantId },
    });
    if (!tenantExists) {
      throw new NotFoundException(`Tenant ${tenantIdParam} not found`);
    }

    // --- Validate plan ---
    const plan = await this.db.plan.findUnique({
      where: { id: BigInt(payload.plan_id) },
    });
    if (!plan) throw new NotFoundException(`Plan ${payload.plan_id} not found`);

    // --- Normalize inputs ---
    const name = payload.name.trim();
    const domain = payload.domain?.trim() || null;

    // --- Update tenant ---
    const tenant = await this.db.tenant.update({
      where: { id: tenantId },
      data: {
        planId: plan.id,
        name,
        domain,
        statusId,
        paymentModelId,
      },
    });

    return {
      id: tenant.id.toString(),
      planId: tenant.planId.toString(),
      name: tenant.name,
    };
  }

  async getTenantDetails(userId: number, id: number) {
    if (!Number.isSafeInteger(userId) || !Number.isSafeInteger(id) || id < 1) {
      throw new BadRequestException('Invalid user ID or tenant ID');
    }

    const user = await this.db.staffUser.findUnique({
      where: {
        id: BigInt(userId),
      },
      include: {
        memberships: {
          include: {
            role: { select: { isSystem: true, tenantId: true } },
          },
        },
      },
    });

    if (!user) {
      throw new UnauthorizedException('Authenticated user not found');
    }

    const isPlatformSuperAdmin = user.memberships.some(
      (membership) =>
        membership.tenantId === null &&
        membership.role.isSystem &&
        membership.role.tenantId === null,
    );

    const tenantId = BigInt(id);

    if (!isPlatformSuperAdmin && user.tenantId !== tenantId) {
      throw new UnauthorizedException('User is not assigned to this tenant');
    }

    const tenant = await this.db.tenant.findUnique({
      where: {
        id: tenantId,
      },
      include: {
        plan: { select: { code: true, name: true } },
        status: { select: { code: true } },
        paymentModel: { select: { code: true } },
      },
    });

    if (!tenant) {
      throw new NotFoundException(`Tenant ${id} not found`);
    }

    return {
      id: tenant.id.toString(),
      plan_id: tenant.planId.toString(),
      plan_code: tenant.plan.code,
      plan_name: tenant.plan.name,
      name: tenant.name,
      status_id: tenant.statusId.toString(),
      status: tenant.status.code,
      payment_model_id: tenant.paymentModelId.toString(),
      payment_model: tenant.paymentModel.code,
      domain: tenant.domain,
      version: tenant.version,
    };
  }

  async createBranch(
    payload: CreateBranchType,
    cookieTenantId?: string,
    user?: AuthUser,
  ) {
    let resolvedTenantId: string;

    if (user && !user.isSuperAdmin) {
      // Tenant admin: use their JWT tenant, ignore cookie
      if (!user.tenantId) {
        throw new ForbiddenException('User is not assigned to a tenant');
      }
      resolvedTenantId = user.tenantId;
    } else {
      // Super admin: tenant_id must come from cookie
      const fromCookie = cookieTenantId?.trim();
      if (!fromCookie) {
        throw new UnauthorizedException('Tenant ID is required in cookie');
      }
      if (!/^\d+$/.test(fromCookie)) {
        throw new BadRequestException('Invalid tenant ID');
      }
      resolvedTenantId = fromCookie;
    }

    const tenantId = BigInt(resolvedTenantId);
    const tenant = await this.db.tenant.findUnique({
      where: { id: tenantId },
    });
    if (!tenant) {
      throw new NotFoundException(`Tenant ${resolvedTenantId} not found`);
    }

    // --- Check duplicate branch name under same tenant ---
    const existingBranch = await this.db.branch.findFirst({
      where: {
        tenantId,
        name: { equals: payload.name.trim(), mode: 'insensitive' as const },
      },
      select: { id: true },
    });
    if (existingBranch) {
      throw new ConflictException(
        'Branch with this name already exists for this tenant',
      );
    }

    const code = await this.generateUniqueCode(payload.name);

    const branch = await this.db.branch.create({
      data: {
        tenantId,
        code,
        name: payload.name.trim(),
        city: payload.city.trim(),
        address: payload.address?.trim() || null,
        phone: payload.phone?.trim() || null,
      },
    });

    return {
      id: branch.id.toString(),
      tenant_id: branch.tenantId.toString(),
      code: branch.code,
      name: branch.name,
      city: branch.city,
      address: branch.address,
      phone: branch.phone,
    };
  }

  async getBranches(
    query: BranchListQueryType,
    cookieTenantId?: string,
    user?: AuthUser,
  ) {
    const page = query.page || 1;
    const limit = query.limit || 10;
    const skip = (page - 1) * limit;

    const where: {
      tenantId?: bigint;
      OR?: Array<
        | { name: { contains: string; mode: 'insensitive' } }
        | { city: { contains: string; mode: 'insensitive' } }
        | { code: { contains: string; mode: 'insensitive' } }
      >;
    } = {};

    if (user && !user.isSuperAdmin) {
      // Tenant admin: always scoped to their own tenant from JWT (authoritative)
      if (!user.tenantId) {
        throw new ForbiddenException('User is not assigned to a tenant');
      }
      where.tenantId = BigInt(user.tenantId);
    } else {
      // Super admin: optionally filter by tenant via cookie
      if (cookieTenantId) {
        // if (!/^\d+$/.test(cookieTenantId.trim())) {
        //   throw new BadRequestException('Invalid tenant ID in cookie');
        // }
        where.tenantId = BigInt(cookieTenantId.trim());
      }
    }

    if (query.search) {
      const term = query.search.trim();
      where.OR = [
        { name: { contains: term, mode: 'insensitive' as const } },
        { city: { contains: term, mode: 'insensitive' as const } },
        { code: { contains: term, mode: 'insensitive' as const } },
      ];
    }

    const orderBy = this.parseBranchSort(query.sort);

    const [total, branches] = await Promise.all([
      this.db.branch.count({ where }),
      this.db.branch.findMany({
        where,
        skip,
        take: limit,
        orderBy,
      }),
    ]);

    const pages = Math.ceil(total / limit) || 1;

    return {
      data: branches.map((b) => ({
        id: Number(b.id),
        tenant_id: Number(b.tenantId),
        code: b.code,
        name: b.name,
        city: b.city,
        address: b.address,
        phone: b.phone,
      })),
      meta: { total, page, limit, pages },
    };
  }

  async createAgent(
    payload: CreateAgentType,
    cookieTenantId?: string,
    user?: AuthUser,
  ) {
    console.log('user', user);
    if (!user) {
      throw new UnauthorizedException('Authentication required');
    }

    const parsedRoleId =
      user.roleId && /^\d+$/.test(user.roleId.trim())
        ? BigInt(user.roleId.trim())
        : null;
    const isPlatformSuperAdmin = user.isSuperAdmin || parsedRoleId === 1n;
    const isTenantManager = parsedRoleId === 2n || parsedRoleId === 3n;

    if (!isPlatformSuperAdmin && !isTenantManager) {
      throw new ForbiddenException(
        'Only Platform Super Admins, Tenant Admins, and Operations Managers can create agents',
      );
    }

    const tenantId = this.resolveRequiredTenantId(cookieTenantId, user);

    const tenant = await this.db.tenant.findUnique({
      where: { id: tenantId },
    });
    if (!tenant) {
      throw new NotFoundException(`Tenant ${tenantId.toString()} not found`);
    }

    let branchId: bigint | null = null;
    if (payload.branch_id !== undefined && payload.branch_id !== null) {
      branchId = BigInt(payload.branch_id);
      const branch = await this.db.branch.findUnique({
        where: { id: branchId },
        select: { id: true, tenantId: true },
      });
      if (!branch) {
        throw new NotFoundException(`Branch ${payload.branch_id} not found`);
      }
      if (branch.tenantId !== tenantId) {
        throw new ForbiddenException('Branch does not belong to this tenant');
      }
    }

    const name = payload.name.trim();
    const email = payload.email?.trim().toLowerCase() || null;

    const existingTarget =
      payload.id !== undefined && payload.id !== null
        ? await this.db.agent.findUnique({
            where: { id: BigInt(payload.id) },
            select: { id: true, tenantId: true, statusId: true },
          })
        : null;

    if (payload.id !== undefined && payload.id !== null) {
      if (!existingTarget) {
        throw new NotFoundException(`Agent ${payload.id} not found`);
      }
      if (existingTarget.tenantId !== tenantId) {
        throw new ForbiddenException('Agent does not belong to this tenant');
      }
    }

    const duplicateAgent = await this.db.agent.findFirst({
      where: {
        tenantId,
        ...(existingTarget ? { id: { not: existingTarget.id } } : {}),
        OR: [
          { name: { equals: name, mode: 'insensitive' as const } },
          ...(email
            ? [{ email: { equals: email, mode: 'insensitive' as const } }]
            : []),
        ],
      },
      select: { id: true, name: true },
    });
    if (duplicateAgent) {
      const field =
        duplicateAgent.name.toLowerCase() === name.toLowerCase()
          ? 'name'
          : 'email';
      throw new ConflictException(
        `Agent with this ${field} already exists for this tenant`,
      );
    }

    const statusId =
      existingTarget && payload.status_id === undefined
        ? existingTarget.statusId
        : await this.resolveAgentStatusId(payload.status_id);

    const agentData = {
      branchId,
      name,
      phone: payload.phone?.trim() || null,
      email,
      creditLimit: BigInt(payload.credit_limit),
      currentBalance: BigInt(payload.current_balance),
      commissionRate: payload.commission_rate.toFixed(2),
      statusId,
    };

    const agent = existingTarget
      ? await this.db.agent.update({
          where: { id: existingTarget.id },
          data: agentData,
          include: {
            status: { select: { code: true } },
          },
        })
      : await this.db.agent.create({
          data: {
            tenantId,
            ...agentData,
          },
          include: {
            status: { select: { code: true } },
          },
        });

    return {
      id: agent.id.toString(),
      tenant_id: agent.tenantId.toString(),
      name: agent.name,
      status: agent.status.code,
    };
  }

  async getAgents(
    query: AgentListQueryType,
    cookieTenantId?: string,
    user?: AuthUser,
  ) {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const skip = (page - 1) * limit;

    const where: {
      tenantId?: bigint;
      branchId?: bigint;
      statusId?: bigint;
      status?: { code: string };
      OR?: Array<
        | { name: { contains: string; mode: 'insensitive' } }
        | { email: { contains: string; mode: 'insensitive' } }
        | { phone: { contains: string; mode: 'insensitive' } }
      >;
    } = {};

    if (user && !user.isSuperAdmin) {
      if (!user.tenantId) {
        throw new ForbiddenException('User is not assigned to a tenant');
      }
      where.tenantId = BigInt(user.tenantId);
    } else if (cookieTenantId) {
      where.tenantId = this.parseNumericId(
        cookieTenantId,
        'Invalid tenant ID in cookie',
      );
    }

    if (query.branch_id !== undefined) {
      where.branchId = BigInt(query.branch_id);
    }

    if (query.status) {
      const trimmed = query.status.trim();
      if (/^\d+$/.test(trimmed)) {
        where.statusId = BigInt(trimmed);
      } else {
        where.status = { code: trimmed.toUpperCase() };
      }
    }

    if (query.search) {
      const term = query.search.trim();
      where.OR = [
        { name: { contains: term, mode: 'insensitive' as const } },
        { email: { contains: term, mode: 'insensitive' as const } },
        { phone: { contains: term, mode: 'insensitive' as const } },
      ];
    }

    const orderBy = this.parseAgentSort(query.sort);

    const [total, agents] = await Promise.all([
      this.db.agent.count({ where }),
      this.db.agent.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: {
          status: { select: { code: true } },
          branch: { select: { name: true } },
        },
      }),
    ]);

    const pages = Math.ceil(total / limit) || 1;

    return {
      data: agents.map((a) => ({
        id: Number(a.id),
        tenant_id: Number(a.tenantId),
        branch_id: a.branchId !== null ? Number(a.branchId) : null,
        branch_name: a.branch?.name ?? null,
        name: a.name,
        phone: a.phone,
        email: a.email,
        credit_limit: Number(a.creditLimit),
        current_balance: Number(a.currentBalance),
        commission_rate: Number(a.commissionRate),
        status_id: Number(a.statusId),
        status: a.status.code,
      })),
      meta: { total, page, limit, pages },
    };
  }

  private resolveRequiredTenantId(
    cookieTenantId?: string,
    user?: AuthUser,
  ): bigint {
    if (user && !user.isSuperAdmin) {
      if (!user.tenantId) {
        throw new ForbiddenException('User is not assigned to a tenant');
      }
      return BigInt(user.tenantId);
    }

    const fromCookie = cookieTenantId?.trim();
    if (!fromCookie) {
      throw new UnauthorizedException('Tenant ID is required in cookie');
    }
    return this.parseNumericId(fromCookie, 'Invalid tenant ID');
  }

  private parseNumericId(value: string, errorMessage: string): bigint {
    const trimmed = value.trim();
    if (!/^\d+$/.test(trimmed)) {
      throw new BadRequestException(errorMessage);
    }
    return BigInt(trimmed);
  }

  private async resolveAgentStatusId(statusId?: number): Promise<bigint> {
    if (statusId !== undefined) {
      const status = await this.db.lookupDtl.findUnique({
        where: { id: BigInt(statusId) },
        include: { lookupMst: { select: { code: true } } },
      });
      if (!status || status.lookupMst.code !== 'AGENT_STATUS') {
        throw new NotFoundException(`Agent status ${statusId} not found`);
      }
      return status.id;
    }

    const activeStatus = await this.db.lookupDtl.findFirst({
      where: {
        code: 'ACTIVE',
        lookupMst: { code: 'AGENT_STATUS' },
      },
      select: { id: true },
    });
    if (!activeStatus) {
      throw new NotFoundException('Lookup AGENT_STATUS.ACTIVE not found');
    }
    return activeStatus.id;
  }

  private parseAgentSort(sortStr?: string) {
    if (!sortStr) return { id: 'desc' as const };
    const [field, dir] = sortStr.split(':');
    const direction =
      dir?.toLowerCase() === 'asc' ? ('asc' as const) : ('desc' as const);

    switch (field?.toLowerCase()) {
      case 'name':
        return { name: direction };
      case 'credit_limit':
      case 'creditlimit':
        return { creditLimit: direction };
      case 'current_balance':
      case 'currentbalance':
        return { currentBalance: direction };
      case 'commission_rate':
      case 'commissionrate':
        return { commissionRate: direction };
      case 'id':
      default:
        return { id: direction };
    }
  }

  private async generateUniqueCode(name: string): Promise<string> {
    const slug =
      name
        .toUpperCase()
        .replace(/[^A-Z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 12) || 'BRN';

    for (let attempt = 0; attempt < 5; attempt++) {
      const suffix = randomBytes(3).toString('hex').toUpperCase();
      const code = `${slug}-${suffix}`;
      const existing = await this.db.branch.findFirst({
        where: { code },
        select: { id: true },
      });
      if (!existing) {
        return code;
      }
    }

    return `${slug}-${Date.now().toString(36).toUpperCase()}`;
  }

  private async assertSuperAdmin(
    roleId: string | undefined,
    user: AuthUser | undefined,
    forbiddenMessage: string,
  ): Promise<void> {
    if (user && !user.isSuperAdmin) {
      throw new ForbiddenException(forbiddenMessage);
    }

    if (!roleId) {
      throw new UnauthorizedException('Authentication required');
    }

    if (!/^\d+$/.test(roleId.trim())) {
      throw new BadRequestException('Invalid role ID');
    }

    const role = await this.db.role.findUnique({
      where: { id: BigInt(roleId.trim()) },
    });
    if (!role || !role.isSystem || role.tenantId !== null) {
      throw new ForbiddenException(forbiddenMessage);
    }
  }

  private parseSort(sortStr?: string) {
    if (!sortStr) return { createdAt: 'desc' as const };
    const [field, dir] = sortStr.split(':');
    const direction =
      dir?.toLowerCase() === 'asc' ? ('asc' as const) : ('desc' as const);

    switch (field?.toLowerCase()) {
      case 'name':
        return { name: direction };
      case 'id':
        return { id: direction };
      case 'plan_id':
      case 'planid':
        return { planId: direction };
      case 'updated_at':
      case 'updatedat':
        return { updatedAt: direction };
      case 'created_at':
      case 'createdat':
      default:
        return { createdAt: direction };
    }
  }

  private parseBranchSort(sortStr?: string) {
    if (!sortStr) return { id: 'desc' as const };
    const [field, dir] = sortStr.split(':');
    const direction =
      dir?.toLowerCase() === 'asc' ? ('asc' as const) : ('desc' as const);

    switch (field?.toLowerCase()) {
      case 'name':
        return { name: direction };
      case 'city':
        return { city: direction };
      case 'code':
        return { code: direction };
      case 'id':
      default:
        return { id: direction };
    }
  }
}
