import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import type { CreateTenantType } from '../dto/tenant.dto.js';
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
}
