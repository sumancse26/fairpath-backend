import { describe, expect, it, vi } from 'vitest';
import { AuthController } from './auth.controller.js';
import type { AuthTokensResponse, RefreshTokenResponse } from './types/auth.types.js';

describe('AuthController', () => {
  const mockAuthService = {
    login: vi.fn(),
    refresh: vi.fn(),
    logout: vi.fn(),
  };

  const controller = new AuthController(mockAuthService as any);

  it('delegates login to authService and returns access and refresh tokens for frontend', async () => {
    const mockResponse: AuthTokensResponse = {
      tokenType: 'Bearer',
      accessToken: 'access-token-123',
      refreshToken: 'refresh-token-456',
      expiresIn: 900,
      user: {
        id: '1',
        email: 'admin@fairpath.com',
        fullName: 'Super Admin',
        phone: null,
        status: 'ACTIVE',
        isSuperAdmin: true,
        memberships: [],
      },
    };
    mockAuthService.login.mockResolvedValue(mockResponse);

    const dto = { email: 'admin@fairpath.com', password: 'password123' };
    const res = await controller.login(dto, '192.168.1.1', 'Mozilla/5.0');

    expect(mockAuthService.login).toHaveBeenCalledWith(dto, {
      ipAddress: '192.168.1.1',
      userAgent: 'Mozilla/5.0',
    });
    expect(res).toEqual(mockResponse);
    expect(res.tokenType).toBe('Bearer');
    expect(res.accessToken).toBe('access-token-123');
    expect(res.refreshToken).toBe('refresh-token-456');
  });

  it('delegates refresh to authService and returns rotated tokens', async () => {
    const mockResponse: RefreshTokenResponse = {
      tokenType: 'Bearer',
      accessToken: 'new-access-123',
      refreshToken: 'new-refresh-456',
      expiresIn: 900,
    };
    mockAuthService.refresh.mockResolvedValue(mockResponse);

    const dto = { refreshToken: 'old-refresh-token' };
    const res = await controller.refresh(dto);

    expect(mockAuthService.refresh).toHaveBeenCalledWith(dto);
    expect(res).toEqual(mockResponse);
    expect(res.accessToken).toBe('new-access-123');
  });

  it('delegates logout to authService', async () => {
    mockAuthService.logout.mockResolvedValue({
      success: true,
      message: 'Logged out successfully',
    });

    const dto = { refreshToken: 'token-to-revoke' };
    const res = await controller.logout(dto);

    expect(mockAuthService.logout).toHaveBeenCalledWith(dto);
    expect(res.success).toBe(true);
  });

  it('returns current user on private me endpoint', () => {
    const mockUser = {
      id: '1',
      email: 'admin@fairpath.com',
      fullName: 'Super Admin',
      status: 'ACTIVE',
      isSuperAdmin: true,
      memberships: [],
    };

    const res = controller.getMe(mockUser as any);
    expect(res).toEqual({ user: mockUser });
  });
});
