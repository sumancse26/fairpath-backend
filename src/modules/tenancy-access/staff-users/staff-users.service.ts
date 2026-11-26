import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import bcrypt from 'bcryptjs';
import type {
  CreateStaffUserSchema,
  StaffUserListQuerySchema,
} from '../dto/staff-user.dto.js';
import { DatabaseService } from '../../../database/database.service.js';
import type { AuthUser } from '../../auth/types/auth.types.js';

@Injectable()
export class StaffUsersService {
  constructor(private readonly db: DatabaseService) {}

  async getStaffUsers(query: StaffUserListQuerySchema, user: AuthUser) {
    if (!user?.id) {
      throw new UnauthorizedException('Authentication required');
    }

    const userTenantId = user.tenantId ? BigInt(user.tenantId) : undefined;
    if (!user.isSuperAdmin && !userTenantId) {
      throw new ForbiddenException('User is not assigned to a tenant');
    }

    const requestedTenantId = query.tenant_id
      ? BigInt(query.tenant_id)
      : undefined;
    if (
      !user.isSuperAdmin &&
      requestedTenantId !== undefined &&
      requestedTenantId !== userTenantId
    ) {
      throw new ForbiddenException('User cannot list staff for this tenant');
    }

    const tenantId = user.isSuperAdmin ? requestedTenantId : userTenantId;
    const page = query.page;
    const limit = query.limit;
    const status = query.status?.trim();
    const where: {
      tenantId?: bigint;
      statusId?: bigint;
      status?: { code: string };
    } = {};

    if (tenantId !== undefined) {
      where.tenantId = tenantId;
    }

    if (query.status_id !== undefined) {
      where.statusId = BigInt(query.status_id);
    }

    if (status) {
      where.status = { code: status.toUpperCase() };
    }

    const [total, staffUsers] = await Promise.all([
      this.db.staffUser.count({ where }),
      this.db.staffUser.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: this.parseStaffUserSort(query.sort),
        select: {
          id: true,
          email: true,
          phone: true,
          fullName: true,
          tenantId: true,
          statusId: true,
          mfaEnabled: true,
          createdAt: true,
          status: { select: { code: true } },
          tenant: { select: { name: true } },
        },
      }),
    ]);

    return {
      data: staffUsers.map((staffUser) => this.toStaffUserResponse(staffUser)),
      meta: { total, page, limit, pages: Math.ceil(total / limit) || 1 },
    };
  }

  private toStaffUserResponse(staffUser: {
    id: bigint;
    email: string | null;
    phone: string | null;
    fullName: string;
    tenantId: bigint | null;
    tenant: { name: string } | null;
    statusId: bigint;
    status: { code: string };
    mfaEnabled: boolean;
    createdAt: Date;
  }) {
    return {
      id: staffUser.id.toString(),
      email: staffUser.email,
      phone: staffUser.phone,
      full_name: staffUser.fullName,
      tenant_id: staffUser.tenantId?.toString() ?? null,
      tenant_name: staffUser.tenant?.name ?? null,
      status_id: staffUser.statusId.toString(),
      status: staffUser.status.code,
      mfa_enabled: staffUser.mfaEnabled,
      created_at: staffUser.createdAt.toISOString(),
    };
  }

  async createStaffUser(payload: CreateStaffUserSchema, creatorId: string) {
    if (!creatorId) {
      throw new UnauthorizedException('Authentication required');
    }

    const creator = await this.db.staffUser.findUnique({
      where: { id: BigInt(creatorId) },
      include: {
        memberships: {
          include: {
            role: { select: { name: true, isSystem: true, tenantId: true } },
            status: { select: { code: true } },
          },
        },
      },
    });

    if (!creator) {
      throw new UnauthorizedException('Authenticated user not found');
    }

    const isPlatformSuperAdmin = creator.memberships.some(
      (membership) =>
        membership.tenantId === null &&
        membership.role.isSystem &&
        membership.role.tenantId === null &&
        membership.role.name.toLowerCase() === 'platform super admin' &&
        membership.status.code === 'ACTIVE',
    );

    const tenantId = BigInt(payload.tenant_id);
    const isTenantAdmin = creator.memberships.some(
      (membership) =>
        membership.tenantId === tenantId &&
        membership.role.name.toLowerCase() === 'tenant admin' &&
        membership.status.code === 'ACTIVE',
    );

    if (!isPlatformSuperAdmin && !isTenantAdmin) {
      throw new ForbiddenException(
        'Only a tenant admin can create staff for that tenant',
      );
    }

    const tenant = await this.db.tenant.findUnique({
      where: { id: tenantId },
    });
    if (!tenant) {
      throw new NotFoundException(`Tenant ${payload.tenant_id} not found`);
    }

    const email = payload.email.trim().toLowerCase();
    const existingUser = await this.db.staffUser.findFirst({
      where: { email: { equals: email, mode: 'insensitive' } },
    });
    if (existingUser) {
      throw new ConflictException('Staff user with this email already exists');
    }

    const status = await this.db.lookupDtl.findUnique({
      where: { id: BigInt(payload.status) },
      include: { lookupMst: { select: { code: true } } },
    });
    if (!status || status.lookupMst.code !== 'STAFF_STATUS') {
      throw new NotFoundException(`Staff status ${payload.status} not found`);
    }

    const passwordHash = await bcrypt.hash(payload.password, 10);
    const staffUser = await this.db.staffUser.create({
      data: {
        email,
        phone: payload.phone.trim(),
        fullName: payload.full_name.trim(),
        passwordHash,
        mfaEnabled: false,
        statusId: status.id,
        tenantId,
        createdById: BigInt(creatorId),
      },
      include: {
        status: { select: { code: true } },
      },
    });

    return {
      id: staffUser.id.toString(),
      email: staffUser.email,
      phone: staffUser.phone,
      full_name: staffUser.fullName,
      tenant_id: staffUser.tenantId?.toString() ?? null,
      status_id: staffUser.statusId.toString(),
      status: staffUser.status.code,
      mfa_enabled: staffUser.mfaEnabled,
      created_at: staffUser.createdAt.toISOString(),
    };
  }

  private parseStaffUserSort(sortStr?: string) {
    const [field, dir] = sortStr?.split(':') ?? [];
    const direction =
      dir?.toLowerCase() === 'asc' ? ('asc' as const) : ('desc' as const);

    switch (field?.toLowerCase()) {
      case 'id':
        return { id: direction };
      case 'email':
        return { email: direction };
      case 'full_name':
      case 'fullname':
        return { fullName: direction };
      default:
        return { createdAt: direction };
    }
  }
}
