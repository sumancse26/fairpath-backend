import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import type {
  CreateTenantType,
  CreateBranchType,
  TenantListQueryType,
  UpdateTenantType,
} from '../dto/tenant.dto.js';
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

  async getTenants(query: TenantListQueryType) {
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
    userId: number,
    id: number,
    payload: CreateBranchType,
  ) {
    if (
      !Number.isSafeInteger(userId) ||
      userId < 1 ||
      !Number.isSafeInteger(id) ||
      id < 1
    ) {
      throw new BadRequestException('Invalid user ID or tenant ID');
    }

    if (payload.tenant_id !== id) {
      throw new BadRequestException(
        'Payload tenant_id must match the tenant ID in the URL',
      );
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
    });

    if (!tenant) {
      throw new NotFoundException(`Tenant ${id} not found`);
    }

    const existingBranch = await this.db.branch.findFirst({
      where: {
        tenantId,
        OR: [
          { code: { equals: payload.code, mode: 'insensitive' as const } },
          { name: { equals: payload.name, mode: 'insensitive' as const } },
        ],
      },
    });

    if (existingBranch) {
      const field =
        existingBranch.code.toLowerCase() === payload.code.toLowerCase()
          ? 'code'
          : 'name';
      throw new ConflictException(`Branch with this ${field} already exists`);
    }

    const branch = await this.db.branch.create({
      data: {
        tenantId,
        code: payload.code,
        name: payload.name,
        city: payload.city || null,
        address: payload.address || null,
        phone: payload.phone || null,
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
}
