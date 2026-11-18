import { UnauthorizedException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import bcrypt from 'bcryptjs';
import { AuthService } from './auth.service.js';

describe('AuthService', () => {
  let authService: AuthService;
  let mockDb: any;
  let mockTokenService: any;

  beforeEach(() => {
    mockDb = {
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

    authService = new AuthService(mockDb as any, mockTokenService as any);
  });

  describe('login', () => {
    it('throws if email or password is missing', async () => {
      await expect(
        authService.login({ email: '', password: '' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('throws if user not found', async () => {
      mockDb.staffUser.findUnique.mockResolvedValue(null);

      await expect(
        authService.login({ email: 'unknown@test.com', password: 'pass' }),
      ).rejects.toThrow('Invalid email or password');
    });

    it('throws if account is inactive', async () => {
      mockDb.staffUser.findUnique.mockResolvedValue({
        id: 1n,
        email: 'user@test.com',
        passwordHash: 'hash',
        status: 'SUSPENDED',
        memberships: [],
      });

      await expect(
        authService.login({ email: 'user@test.com', password: 'pass' }),
      ).rejects.toThrow('Account is inactive or suspended');
    });

    it('throws on wrong password', async () => {
      const hash = await bcrypt.hash('correct', 10);
      mockDb.staffUser.findUnique.mockResolvedValue({
        id: 1n,
        email: 'user@test.com',
        passwordHash: hash,
        status: 'ACTIVE',
        memberships: [],
      });

      await expect(
        authService.login({ email: 'user@test.com', password: 'wrong' }),
      ).rejects.toThrow('Invalid email or password');
    });

    it('returns tokens and user on success', async () => {
      const hash = await bcrypt.hash('Secret@123', 10);
      mockDb.staffUser.findUnique.mockResolvedValue({
        id: 1n,
        email: 'admin@fairpath.com',
        passwordHash: hash,
        fullName: 'Admin User',
        phone: null,
        status: 'ACTIVE',
        memberships: [
          {
            id: 10n,
            tenantId: 2n,
            branchId: 3n,
            roleId: 5n,
            status: 'ACTIVE',
            role: { id: 5n, name: 'Admin' },
            tenant: { id: 2n, name: 'Acme Corp' },
          },
        ],
      });
      mockDb.staffUser.update.mockResolvedValue({});
      mockTokenService.issue.mockResolvedValue({
        accessToken: 'access-123',
        refreshToken: 'refresh-456',
        expiresIn: 900,
      });

      const result = await authService.login(
        { email: 'admin@fairpath.com', password: 'Secret@123' },
        '127.0.0.1',
      );

      expect(result.accessToken).toBe('access-123');
      expect(result.refreshToken).toBe('refresh-456');
      expect(result.user.email).toBe('admin@fairpath.com');
      expect(result.user.roleId).toBe('5');
      expect(result.user.tenantId).toBe('2');
      expect(result.user.branchId).toBe('3');
      expect(result.user.isSuperAdmin).toBe(false);

      // Verify claims include roleId, tenantId, branchId
      expect(mockTokenService.issue).toHaveBeenCalledWith('1', {
        claims: {
          email: 'admin@fairpath.com',
          roleId: '5',
          tenantId: '2',
          branchId: '3',
          isSuperAdmin: false,
        },
        method: 'password',
      });
    });
  });

  describe('refresh', () => {
    it('returns new tokens', async () => {
      mockTokenService.refresh.mockResolvedValue({
        accessToken: 'new-access',
        refreshToken: 'new-refresh',
        expiresIn: 900,
      });

      const result = await authService.refresh({ refreshToken: 'old-token' });
      expect(result.accessToken).toBe('new-access');
      expect(result.refreshToken).toBe('new-refresh');
    });

    it('throws if refresh token is missing', async () => {
      await expect(
        authService.refresh({ refreshToken: '' }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('throws on invalid token', async () => {
      mockTokenService.refresh.mockRejectedValue(new Error('bad'));

      await expect(
        authService.refresh({ refreshToken: 'invalid' }),
      ).rejects.toThrow('Invalid or expired refresh token');
    });
  });

  describe('logout', () => {
    it('revokes refresh token', async () => {
      mockTokenService.revoke.mockResolvedValue(true);

      await authService.logout({ refreshToken: 'token' });
      expect(mockTokenService.revoke).toHaveBeenCalledWith('token');
    });
  });

  describe('validateUserById', () => {
    it('returns user when found and active', async () => {
      mockDb.staffUser.findUnique.mockResolvedValue({
        id: 1n,
        email: 'staff@test.com',
        fullName: 'Staff',
        phone: null,
        status: 'ACTIVE',
        memberships: [
          {
            id: 20n,
            tenantId: 5n,
            branchId: null,
            roleId: 3n,
            status: 'ACTIVE',
            role: { id: 3n, name: 'Agent' },
            tenant: { id: 5n, name: 'Tenant A' },
          },
        ],
      });

      const user = await authService.validateUserById('1');
      expect(user).toEqual({
        id: '1',
        email: 'staff@test.com',
        fullName: 'Staff',
        phone: null,
        status: 'ACTIVE',
        isSuperAdmin: false,
        roleId: '3',
        roleName: 'Agent',
        tenantId: '5',
        tenantName: 'Tenant A',
        branchId: null,
      });
    });

    it('returns null when user not found', async () => {
      mockDb.staffUser.findUnique.mockResolvedValue(null);
      expect(await authService.validateUserById('999')).toBeNull();
    });
  });
});
