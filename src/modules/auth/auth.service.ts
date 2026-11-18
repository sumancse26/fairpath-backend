import { Injectable, UnauthorizedException } from '@nestjs/common';
import bcrypt from 'bcryptjs';
import { TokenService } from '@nestjs/authentication';
import { DatabaseService } from '../../database/database.service.js';
import type { LoginDto } from './dto/login.dto.js';
import type { RefreshTokenDto } from './dto/refresh-token.dto.js';
import type {
  AuthTokensResponse,
  AuthUser,
  JwtPayload,
  RefreshTokenResponse,
  StaffUserRecord,
} from './types/auth.types.js';

const STAFF_INCLUDE = {
  memberships: {
    where: { status: { equals: 'ACTIVE', mode: 'insensitive' } },
    include: {
      role: { select: { id: true, name: true } },
      tenant: { select: { id: true, name: true } },
    },
  },
} as const;

@Injectable()
export class AuthService {
  constructor(
    private readonly db: DatabaseService,
    private readonly tokenService: TokenService,
  ) {}

  async login(dto: LoginDto, ip?: string): Promise<AuthTokensResponse> {
    const email = dto.email?.trim().toLowerCase();
    if (!email || !dto.password) {
      throw new UnauthorizedException('Email and password are required');
    }

    const user = (await this.db.staffUser.findUnique({
      where: { email },
      include: STAFF_INCLUDE,
    })) as StaffUserRecord | null;

    if (!user || !user.passwordHash) {
      throw new UnauthorizedException('Invalid email or password');
    }

    if (user.status !== 'ACTIVE') {
      throw new UnauthorizedException('Account is inactive or suspended');
    }

    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    // Update login tracking
    await this.db.staffUser.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date(), lastLoginIp: ip ?? null },
    });

    const authUser = this.toAuthUser(user);
    const claims = this.buildClaims(authUser);

    const tokens = await this.tokenService.issue(authUser.id, {
      claims,
      method: 'password',
    });

    return {
      user: authUser,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken ?? '',
      expiresIn: tokens.expiresIn,
    };
  }

  async refresh(dto: RefreshTokenDto): Promise<RefreshTokenResponse> {
    if (!dto.refreshToken) {
      throw new UnauthorizedException('Refresh token is required');
    }

    try {
      const tokens = await this.tokenService.refresh(dto.refreshToken);
      return {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresIn: tokens.expiresIn,
      };
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
  }

  async logout(dto: RefreshTokenDto): Promise<void> {
    if (dto.refreshToken) {
      try {
        await this.tokenService.revoke(dto.refreshToken);
      } catch {
        // Already revoked — ignore
      }
    }
  }

  async validateUserById(id: string): Promise<AuthUser | null> {
    try {
      const user = (await this.db.staffUser.findUnique({
        where: { id: BigInt(id) },
        include: STAFF_INCLUDE,
      })) as StaffUserRecord | null;

      if (!user || !user.email || user.status?.toLowerCase() !== 'active') {
        return null;
      }

      return this.toAuthUser(user);
    } catch {
      return null;
    }
  }

  private toAuthUser(user: StaffUserRecord): AuthUser {
    const isSuperAdmin = user.memberships.some((m) => m.tenantId === null);
    const primary = user.memberships[0] ?? null;

    return {
      id: user.id.toString(),
      email: user.email ?? '',
      fullName: user.fullName,
      phone: user.phone,
      status: user.status,
      isSuperAdmin,
      roleId: primary?.roleId?.toString() ?? null,
      roleName: primary?.role?.name ?? null,
      tenantId: primary?.tenantId?.toString() ?? null,
      tenantName: primary?.tenant?.name ?? null,
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
