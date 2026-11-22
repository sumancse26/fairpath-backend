import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import type {
  CreateTenantType,
  TenantListQueryType,
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
      this.db.lookupMst.findUnique({ where: { id: 2 } }),
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
        where: { lookupMstId: paymentModelMst.id, code: 'TENANT_COLLECT' },
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
