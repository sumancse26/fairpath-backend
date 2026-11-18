import {
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { HttpAdapterHost, Reflector } from '@nestjs/core';
import {
  AuthenticationGuard,
  AuthenticationRegistry,
} from '@nestjs/authentication';
import type { Request } from 'express';

/**
 * Global JWT authentication guard.
 *
 * Capabilities:
 * 1. Protects private routes by default.
 * 2. Bypasses routes marked with `@Public()`.
 * 3. Extracts JWT from `Authorization: Bearer <token>` header.
 * 4. Falls back to `access_token` httpOnly cookie when header is absent.
 * 5. Normalizes credentials onto `req.headers.authorization` for downstream providers.
 */
@Injectable()
export class JwtAuthGuard extends AuthenticationGuard {
  constructor(
    reflector: Reflector,
    adapterHost: HttpAdapterHost,
    registry: AuthenticationRegistry,
  ) {
    super(reflector, adapterHost, registry);
  }

  override async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<Request>();

    if (req) {
      this.extractAndNormalizeToken(req);
    }

    try {
      return (await super.canActivate(context)) as boolean;
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException(
        error instanceof Error ? error.message : 'Unauthorized',
      );
    }
  }

  /**
   * If `Authorization` header is not present, attempt to extract `access_token`
   * from the request cookie and inject it as `Bearer <token>`.
   */
  private extractAndNormalizeToken(req: Request): void {
    if (req.headers.authorization) {
      return;
    }

    const cookieHeader = req.headers.cookie;
    if (!cookieHeader) {
      return;
    }

    const match = cookieHeader.match(/(?:^|;\s*)access_token=([^;]+)/);
    if (match?.[1]) {
      req.headers.authorization = `Bearer ${decodeURIComponent(match[1])}`;
    }
  }
}
