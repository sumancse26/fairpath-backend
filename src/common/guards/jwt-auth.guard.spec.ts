import { describe, expect, it, vi, beforeEach } from 'vitest';
import { ExecutionContext } from '@nestjs/common';
import { JwtAuthGuard } from './jwt-auth.guard.js';

describe('JwtAuthGuard', () => {
  let guard: JwtAuthGuard;
  let mockReflector: any;
  let mockAdapterHost: any;
  let mockRegistry: any;

  beforeEach(() => {
    mockReflector = {
      get: vi.fn(),
    };
    mockAdapterHost = {
      httpAdapter: {},
    };
    mockRegistry = {
      providers: [],
      handler: vi.fn(),
    };

    guard = new JwtAuthGuard(
      mockReflector as any,
      mockAdapterHost as any,
      mockRegistry as any,
    );
  });

  const createMockContext = (headers: Record<string, string | undefined>) => {
    const req = { headers };
    return {
      switchToHttp: () => ({
        getRequest: () => req,
        getResponse: () => ({}),
      }),
      getClass: () => ({}),
      getHandler: () => ({}),
      getType: () => 'http',
    } as unknown as ExecutionContext;
  };

  it('injects Bearer token from access_token cookie when authorization header is missing', async () => {
    const context = createMockContext({
      cookie: 'other=123; access_token=my-secret-jwt-token; foo=bar',
    });

    // Mock super.canActivate
    vi.spyOn(
      Object.getPrototypeOf(JwtAuthGuard.prototype),
      'canActivate',
    ).mockResolvedValue(true);

    const result = await guard.canActivate(context);
    const req = context.switchToHttp().getRequest();

    expect(req.headers.authorization).toBe('Bearer my-secret-jwt-token');
    expect(result).toBe(true);
  });

  it('preserves existing Authorization header without overwriting from cookie', async () => {
    const context = createMockContext({
      authorization: 'Bearer existing-token',
      cookie: 'access_token=cookie-token',
    });

    vi.spyOn(
      Object.getPrototypeOf(JwtAuthGuard.prototype),
      'canActivate',
    ).mockResolvedValue(true);

    const result = await guard.canActivate(context);
    const req = context.switchToHttp().getRequest();

    expect(req.headers.authorization).toBe('Bearer existing-token');
    expect(result).toBe(true);
  });

  it('leaves authorization undefined if no cookie and no header are present', async () => {
    const context = createMockContext({});

    vi.spyOn(
      Object.getPrototypeOf(JwtAuthGuard.prototype),
      'canActivate',
    ).mockResolvedValue(true);

    const result = await guard.canActivate(context);
    const req = context.switchToHttp().getRequest();

    expect(req.headers.authorization).toBeUndefined();
    expect(result).toBe(true);
  });
});
