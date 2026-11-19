import { describe, expect, it, vi } from 'vitest';
import { AuthController } from './auth.controller.js';

describe('AuthController', () => {
  const mockAuthService = {
    login: vi.fn(),
    refresh: vi.fn(),
    logout: vi.fn(),
  };

  const mockConfig = {
    get: vi.fn((key: string) => {
      const map: Record<string, string> = {
        COOKIE_DOMAIN: 'localhost',
        COOKIE_SECURE: 'false',
      };
      return map[key];
    }),
  };

  const controller = new AuthController(
    mockAuthService as any,
    mockConfig as any,
  );

  const mockReq = {
    headers: {},
  } as any;

  const mockRes = {
    cookie: vi.fn(),
    clearCookie: vi.fn(),
  } as any;

  it('login sets cookies and returns user + accessToken', async () => {
    mockAuthService.login.mockResolvedValue({
      user: { id: '1', email: 'admin@test.com', fullName: 'Admin' },
      accessToken: 'access-123',
      refreshToken: 'refresh-456',
      expiresIn: 900,
    });

    const result = await controller.login(
      { email: 'admin@test.com', password: 'pass' },
      '127.0.0.1',
      mockRes,
    );

    expect(result.accessToken).toBe('access-123');
    expect(result.refreshToken).toBe('refresh-456');
    expect(result.user.email).toBe('admin@test.com');
    expect(mockRes.cookie).toHaveBeenCalledWith(
      'access_token',
      'access-123',
      expect.objectContaining({ httpOnly: true }),
    );
    expect(mockRes.cookie).toHaveBeenCalledWith(
      'refresh_token',
      'refresh-456',
      expect.objectContaining({ httpOnly: true, path: '/api' }),
    );
    expect(mockRes.cookie).toHaveBeenCalledWith(
      'user_id',
      '1',
      expect.objectContaining({ httpOnly: false }),
    );
  });

  it('refresh sets new cookies from body', async () => {
    mockAuthService.refresh.mockResolvedValue({
      accessToken: 'new-access',
      refreshToken: 'new-refresh',
      expiresIn: 900,
    });

    const result = await controller.refresh(
      { refreshToken: 'old-token' },
      mockReq,
      mockRes,
    );

    expect(mockAuthService.refresh).toHaveBeenCalledWith('old-token');
    expect(result.accessToken).toBe('new-access');
    expect(result.refreshToken).toBe('new-refresh');
    expect(mockRes.cookie).toHaveBeenCalled();
  });

  it('refresh falls back to cookie when body has no token', async () => {
    mockAuthService.refresh.mockResolvedValue({
      accessToken: 'cookie-access',
      refreshToken: 'cookie-refresh',
      expiresIn: 900,
    });

    const reqWithCookie = {
      headers: { cookie: 'refresh_token=from-cookie; other=val' },
    } as any;

    const result = await controller.refresh({}, reqWithCookie, mockRes);

    expect(mockAuthService.refresh).toHaveBeenCalledWith('from-cookie');
    expect(result.accessToken).toBe('cookie-access');
  });

  it('logout clears cookies', async () => {
    mockAuthService.logout.mockResolvedValue(undefined);

    await controller.logout({ refreshToken: 'token' }, mockReq, mockRes);

    expect(mockAuthService.logout).toHaveBeenCalledWith('token');
    expect(mockRes.clearCookie).toHaveBeenCalledWith(
      'access_token',
      expect.any(Object),
    );
    expect(mockRes.clearCookie).toHaveBeenCalledWith(
      'refresh_token',
      expect.objectContaining({ path: '/api' }),
    );
  });

  it('getMe returns current user', () => {
    const user = { id: '1', email: 'admin@test.com' };
    const result = controller.getMe(user as any);
    expect(result).toEqual({ user });
  });
});
