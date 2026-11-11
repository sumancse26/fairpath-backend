import { Injectable, UnauthorizedException } from '@nestjs/common';
import bcrypt from 'bcryptjs';
import { TokenService } from '@nestjs/authentication';
import { DatabaseService } from '../../../database/database.service.js';
import type { LoginDto } from './dto/login.dto.js';
import type { AuthTokensResponse, AuthUser } from './types/auth.types.js';

@Injectable()
export class AuthService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly tokenService: TokenService,
  ) {}

  async login(dto: LoginDto, ipAddress?: string): Promise<AuthTokensResponse> {
    const email = dto.email?.trim().toLowerCase();
    if (!email || !dto.password) {
      throw new UnauthorizedException('Email and password are required');
    }

    const user = await this.databaseService.staffUser.findUnique({
      where: { email },
    });

    if (!user || !user.email) {
      throw new UnauthorizedException('Invalid email or password');
    }

    if (user.lockedUntil && user.lockedUntil > new Date()) {
      throw new UnauthorizedException(
        'Account is temporarily locked due to too many failed attempts. Try again later.',
      );
    }

    if (user.status !== 'ACTIVE') {
      throw new UnauthorizedException('Account is inactive or suspended');
    }

    if (!user.passwordHash) {
      throw new UnauthorizedException(
        'Password login is not enabled for this account.',
      );
    }

    const isMatch = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isMatch) {
      const failedAttempts = user.failedLoginAttempts + 1;
      const lockedUntil =
        failedAttempts >= 5
          ? new Date(Date.now() + 15 * 60 * 1000) // 15-minute lock
          : null;

      await this.databaseService.staffUser.update({
        where: { id: user.id },
        data: {
          failedLoginAttempts: failedAttempts,
          lockedUntil,
        },
      });

      throw new UnauthorizedException('Invalid email or password');
    }

    const now = new Date();
    await this.databaseService.staffUser.update({
      where: { id: user.id },
      data: {
        failedLoginAttempts: 0,
        lockedUntil: null,
        lastLoginAt: now,
        lastActiveAt: now,
        lastLoginIp: ipAddress ?? null,
      },
    });

    // Generate access and refresh tokens
    const tokens = await this.tokenService.issue(user.id.toString(), {
      claims: {
        email: user.email,
      },
      method: 'password',
    });

    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresIn: tokens.expiresIn,
      user: {
        id: user.id.toString(),
        email: user.email,
        fullName: user.fullName,
        phone: user.phone,
        status: user.status,
      },
    };
  }

  async validateUserById(id: string): Promise<AuthUser | null> {
    try {
      const user = await this.databaseService.staffUser.findUnique({
        where: { id: BigInt(id) },
      });

      if (!user || !user.email || user.status !== 'ACTIVE') {
        return null;
      }

      return {
        id: user.id.toString(),
        email: user.email,
        fullName: user.fullName,
        phone: user.phone,
        status: user.status,
      };
    } catch {
      return null;
    }
  }
}
