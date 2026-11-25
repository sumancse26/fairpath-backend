import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import bcrypt from 'bcryptjs';
import type { CreateStaffUserSchema } from '../dto/staff-user.dto.js';
import { DatabaseService } from '../../../database/database.service.js';

@Injectable()
export class StaffUsersService {
  constructor(private readonly db: DatabaseService) {}

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
}
