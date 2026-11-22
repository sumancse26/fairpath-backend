import { Injectable, UnauthorizedException } from '@nestjs/common';
import bcrypt from 'bcryptjs';
import { TokenService } from '@nestjs/authentication';
import { DatabaseService } from '../../database/database.service.js';
import type { LoginDto } from './dto/login.dto.js';
import type {
  AuthTokensResponse,
  AuthUser,
  JwtPayload,
  RefreshTokenResponse,
  StaffUserRecord,
} from './types/auth.types.js';

const ACTIVE_STAFF_STATUS_ID = 15;
const ACTIVE_MEMBERSHIP_STATUS_ID = 20;

@Injectable()
export class AuthService {
  constructor(
    private readonly db: DatabaseService,
    private readonly tokenService: TokenService,
  ) {}

  async login(dto: LoginDto, ip?: string): Promise<AuthTokensResponse> {
    const email = dto.email.toLowerCase();
    const { activeStaffId, activeMembershipId } =
      await this.getActiveStatusIds();

    const user = (await this.db.staffUser.findUnique({
      where: { email },
      include: {
        tenant: { select: { name: true } },
        memberships: {
          where: activeMembershipId
            ? { statusId: activeMembershipId }
            : undefined,
          include: {
            role: { select: { id: true, name: true } },
            tenant: { select: { id: true, name: true } },
          },
        },
      },
    })) as StaffUserRecord | null;

    if (!user || !user.passwordHash) {
      throw new UnauthorizedException('Invalid email or password');
    }

    if (activeStaffId && BigInt(user.statusId) !== BigInt(activeStaffId)) {
      throw new UnauthorizedException('Account is inactive or suspended');
    }

    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    await this.db.staffUser.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date(), lastLoginIp: ip ?? null },
    });

    const authUser = this.toAuthUser(user);
    const tokens = await this.tokenService.issue(authUser.id, {
      claims: this.buildClaims(authUser),
      method: 'password',
    });

    return {
      user: authUser,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken ?? '',
      expiresIn: tokens.expiresIn,
    };
  }

  async refresh(refreshToken: string): Promise<RefreshTokenResponse> {
    try {
      const tokens = await this.tokenService.refresh(refreshToken);
      return {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresIn: tokens.expiresIn,
      };
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
  }

  async logout(refreshToken: string): Promise<void> {
    try {
      await this.tokenService.revoke(refreshToken);
    } catch {
      // Already revoked — ignore
    }
  }

  async validateUserById(id: string): Promise<AuthUser | null> {
    try {
      const { activeStaffId, activeMembershipId } =
        await this.getActiveStatusIds();

      const user = (await this.db.staffUser.findUnique({
        where: { id: BigInt(id) },
        include: {
          tenant: { select: { name: true } },
          memberships: {
            where: activeMembershipId
              ? { statusId: activeMembershipId }
              : undefined,
            include: {
              role: { select: { id: true, name: true } },
              tenant: { select: { id: true, name: true } },
            },
          },
        },
      })) as StaffUserRecord | null;

      if (!user || !user.email) {
        return null;
      }

      if (activeStaffId && BigInt(user.statusId) !== BigInt(activeStaffId)) {
        return null;
      }

      return this.toAuthUser(user);
    } catch {
      return null;
    }
  }

  private async getActiveStatusIds() {
    const [activeStaff, activeMembership] = await Promise.all([
      this.db.lookupDtl.findUnique({ where: { id: ACTIVE_STAFF_STATUS_ID } }),
      this.db.lookupDtl.findUnique({
        where: { id: ACTIVE_MEMBERSHIP_STATUS_ID },
      }),
    ]);

    return {
      activeStaffId: activeStaff?.id ?? ACTIVE_STAFF_STATUS_ID,
      activeMembershipId: activeMembership?.id ?? ACTIVE_MEMBERSHIP_STATUS_ID,
    };
  }

  private toAuthUser(user: StaffUserRecord): AuthUser {
    const isSuperAdmin = user.memberships.some((m) => m.tenantId === null);
    const primary = user.memberships[0] ?? null;

    return {
      id: user.id.toString(),
      email: user.email ?? '',
      fullName: user.fullName,
      phone: user.phone,
      status: user.statusId.toString(),
      isSuperAdmin,
      roleId: primary?.roleId?.toString() ?? null,
      roleName: primary?.role?.name ?? null,
      tenantId:
        primary?.tenantId?.toString() ?? user.tenantId?.toString() ?? null,
      tenantName: primary?.tenant?.name ?? user.tenant?.name ?? null,
      branchId: primary?.branchId?.toString() ?? null,
    };
  }

  private buildClaims(user: AuthUser): Omit<JwtPayload, 'sub'> {
    return {
      email: user.email,
      roleId: user.roleId,
      tenantId: user.tenantId,
      branchId: user.branchId,
      isSuperAdmin: user.isSuperAdmin,
    };
  }
}
