import { UnauthorizedException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import bcrypt from 'bcryptjs';
import { AuthService } from './auth.service.js';

describe('AuthService', () => {
  let authService: AuthService;
  let mockDatabaseService: any;
  let mockTokenService: any;

  beforeEach(() => {
    mockDatabaseService = {
      staffUser: {
        findUnique: vi.fn(),
        update: vi.fn(),
      },
    };

    mockTokenService = {
      issue: vi.fn(),
      refresh: vi.fn(),
      revoke: vi.fn(),
    };

    authService = new AuthService(
      mockDatabaseService as any,
      mockTokenService as any,
    );
  });

  describe('login', () => {
    it('throws UnauthorizedException if email or password is missing', async () => {
      await expect(
        authService.login({ email: '', password: '' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('throws UnauthorizedException if user not found', async () => {
      mockDatabaseService.staffUser.findUnique.mockResolvedValue(null);

      await expect(
        authService.login({ email: 'unknown@example.com', password: 'password' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('throws UnauthorizedException if account is inactive', async () => {
      mockDatabaseService.staffUser.findUnique.mockResolvedValue({
        id: 1n,
        email: 'inactive@example.com',
        status: 'SUSPENDED',
        passwordHash: 'hash',
        memberships: [],
      });

      await expect(
        authService.login({ email: 'inactive@example.com', password: 'password' }),
      ).rejects.toThrow('Account is inactive or suspended');
    });

    it('throws UnauthorizedException on wrong password', async () => {
      const hash = await bcrypt.hash('CorrectPass@123', 10);
      mockDatabaseService.staffUser.findUnique.mockResolvedValue({
        id: 1n,
        email: 'user@example.com',
        passwordHash: hash,
        status: 'ACTIVE',
        memberships: [],
      });

      await expect(
        authService.login({ email: 'user@example.com', password: 'WrongPassword' }),
      ).rejects.toThrow('Invalid email or password');
    });

    it('authenticates successfully and generates access and refresh tokens', async () => {
      const hash = await bcrypt.hash('SuperSecret@123', 10);
      mockDatabaseService.staffUser.findUnique.mockResolvedValue({
        id: 1n,
        email: 'admin@fairpath.com',
        passwordHash: hash,
        fullName: 'Super Admin',
        phone: null,
        status: 'ACTIVE',
        memberships: [
          {
            id: 10n,
            tenantId: null,
            status: 'ACTIVE',
            role: { name: 'Super Admin', slug: 'super-admin' },
            tenant: null,
          },
        ],
      });

      mockDatabaseService.staffUser.update.mockResolvedValue({});

      mockTokenService.issue.mockResolvedValue({
        accessToken: 'mock-access-token',
        refreshToken: 'mock-refresh-token',
        expiresIn: 900,
      });

      const result = await authService.login(
        { email: 'admin@fairpath.com', password: 'SuperSecret@123' },
        { ipAddress: '127.0.0.1', userAgent: 'test-agent' },
      );

      expect(result.tokenType).toBe('Bearer');
      expect(result.accessToken).toBe('mock-access-token');
      expect(result.refreshToken).toBe('mock-refresh-token');
      expect(result.expiresIn).toBe(900);
      expect(result.user.email).toBe('admin@fairpath.com');
      expect(result.user.isSuperAdmin).toBe(true);

      // Verify login tracking updated
      expect(mockDatabaseService.staffUser.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 1n },
          data: expect.objectContaining({
            lastLoginIp: '127.0.0.1',
          }),
        }),
      );
    });
  });

  describe('refresh', () => {
    it('refreshes token successfully', async () => {
      mockTokenService.refresh.mockResolvedValue({
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
        expiresIn: 900,
      });

      const result = await authService.refresh({ refreshToken: 'valid-refresh-token' });
      expect(result.tokenType).toBe('Bearer');
      expect(result.accessToken).toBe('new-access-token');
      expect(result.refreshToken).toBe('new-refresh-token');
      expect(result.expiresIn).toBe(900);
    });

    it('throws UnauthorizedException if refresh token is missing', async () => {
      await expect(
        authService.refresh({ refreshToken: '' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('throws UnauthorizedException on invalid token', async () => {
      mockTokenService.refresh.mockRejectedValue(new Error('Invalid token'));

      await expect(
        authService.refresh({ refreshToken: 'invalid-token' }),
      ).rejects.toThrow('Invalid or expired refresh token');
    });
  });

  describe('logout', () => {
    it('revokes token', async () => {
      mockTokenService.revoke.mockResolvedValue(true);

      const res = await authService.logout({ refreshToken: 'some-token' });
      expect(res.success).toBe(true);
      expect(mockTokenService.revoke).toHaveBeenCalledWith('some-token');
    });
  });

  describe('validateUserById', () => {
    it('returns user when found and active', async () => {
      mockDatabaseService.staffUser.findUnique.mockResolvedValue({
        id: 1n,
        email: 'staff@example.com',
        fullName: 'Staff Member',
        phone: null,
        status: 'ACTIVE',
        memberships: [
          {
            id: 20n,
            tenantId: 5n,
            status: 'ACTIVE',
            role: { name: 'Admin', slug: 'admin' },
            tenant: { id: 5n, name: 'Tenant A', slug: 'tenant-a' },
          },
        ],
      });

      const user = await authService.validateUserById('1');
      expect(user).toEqual({
        id: '1',
        email: 'staff@example.com',
        fullName: 'Staff Member',
        phone: null,
        status: 'ACTIVE',
        isSuperAdmin: false,
        memberships: [
          {
            tenantId: '5',
            tenantName: 'Tenant A',
            roleName: 'Admin',
          },
        ],
      });
    });

    it('returns null when user not found or inactive', async () => {
      mockDatabaseService.staffUser.findUnique.mockResolvedValue(null);
      const user = await authService.validateUserById('999');
      expect(user).toBeNull();
    });
  });
});
