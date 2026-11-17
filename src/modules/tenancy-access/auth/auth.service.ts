import { Injectable, UnauthorizedException } from '@nestjs/common';
import bcrypt from 'bcryptjs';
import { TokenService } from '@nestjs/authentication';
import { DatabaseService } from '../../../database/database.service.js';
import type { LoginDto } from './dto/login.dto.js';
import type { RefreshTokenDto } from './dto/refresh-token.dto.js';
import type {
  AuthTokensResponse,
  AuthUser,
  RefreshTokenResponse,
  RequestMeta,
  StaffUserRecord,
  TenantRoleInfo,
} from './types/auth.types.js';

const STAFF_AUTH_INCLUDE = {
  memberships: {
    where: { status: 'ACTIVE' },
    include: {
      role: true,
      tenant: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  },
} as const;

@Injectable()
export class AuthService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly tokenService: TokenService,
  ) {}

  /**
   * Authenticate staff user and issue access/refresh token pair
   */
  async login(dto: LoginDto, meta?: RequestMeta): Promise<AuthTokensResponse> {
    const email = dto.email?.trim().toLowerCase();
    if (!email || !dto.password) {
      throw new UnauthorizedException('Email and password are required');
    }

    const user = (await this.databaseService.staffUser.findUnique({
      where: { email },
      include: STAFF_AUTH_INCLUDE,
    })) as StaffUserRecord | null;

    if (!user || !user.email || !user.passwordHash) {
      throw new UnauthorizedException('Invalid email or password');
    }

    if (user.status !== 'ACTIVE') {
      throw new UnauthorizedException('Account is inactive or suspended');
    }

    const isPasswordValid = await bcrypt.compare(
      dto.password,
      user.passwordHash,
    );
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const now = new Date();
    await this.databaseService.staffUser.update({
      where: { id: user.id },
      data: {
        lastLoginAt: now,
        lastActiveAt: now,
        lastLoginIp: meta?.ipAddress ?? null,
      },
    });

    // Issue tokens using Nest TokenService (configured via .env JWT values)
    const tokens = await this.tokenService.issue(user.id.toString(), {
      claims: { email: user.email },
      method: 'password',
    });

    return {
      tokenType: 'Bearer',
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken ?? '',
      expiresIn: tokens.expiresIn,
      user: this.mapToAuthUser(user),
    };
  }

  /**
   * Rotate refresh token and issue new access token
   */
  async refresh(dto: RefreshTokenDto): Promise<RefreshTokenResponse> {
    if (!dto.refreshToken) {
      throw new UnauthorizedException('Refresh token is required');
    }

    try {
      const refreshed = await this.tokenService.refresh(dto.refreshToken);

      return {
        tokenType: 'Bearer',
        accessToken: refreshed.accessToken,
        refreshToken: refreshed.refreshToken,
        expiresIn: refreshed.expiresIn,
      };
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }
  }

  /**
   * Revoke token family
   */
  async logout(
    dto: RefreshTokenDto,
  ): Promise<{ success: boolean; message: string }> {
    if (dto.refreshToken) {
      try {
        await this.tokenService.revoke(dto.refreshToken);
      } catch {
        // Ignore if already revoked
      }
    }

    return {
      success: true,
      message: 'Logged out successfully',
    };
  }

  /**
   * Validate authenticated user identity from decoded JWT sub claim
   */
  async validateUserById(id: string): Promise<AuthUser | null> {
    try {
      const user = (await this.databaseService.staffUser.findUnique({
        where: { id: BigInt(id) },
        include: STAFF_AUTH_INCLUDE,
      })) as StaffUserRecord | null;

      if (!user || !user.email || user.status !== 'ACTIVE') {
        return null;
      }

      return this.mapToAuthUser(user);
    } catch {
      return null;
    }
  }

  private mapToAuthUser(user: StaffUserRecord): AuthUser {
    const isSuperAdmin = user.memberships.some((m) => m.tenantId === null);

    const memberships: TenantRoleInfo[] = user.memberships.map((m) => ({
      tenantId: m.tenantId ? m.tenantId.toString() : null,
      tenantName: m.tenant?.name,
      // tenantSlug: m.tenant?.slug,
      roleName: m.role?.name ?? '',
      // roleSlug: m.role?.slug ?? '',
    }));

    return {
      id: user.id.toString(),
      email: user.email ?? '',
      fullName: user.fullName,
      phone: user.phone,
      status: user.status,
      isSuperAdmin,
      memberships,
    };
  }
}
