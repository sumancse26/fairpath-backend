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
   * Extracts and normalizes the bearer token from the Authorization header or cookie.
   * Tolerates common client formatting issues such as quotes, duplicate "Bearer",
   * trailing semicolons, or missing "Bearer" prefixes.
   */
  private extractAndNormalizeToken(req: Request): void {
    let auth = req.headers.authorization;

    if (auth) {
      auth = auth.trim().replace(/^["']|["']$/g, '').trim();
      auth = auth.replace(/^(?:Bearer\s+)+/i, 'Bearer ');

      if (!/^Bearer\s+/i.test(auth)) {
        auth = `Bearer ${auth}`;
      }

      const match = auth.match(/^Bearer\s+(.*)$/i);
      if (match?.[1]) {
        let token = match[1].trim();
        token = token.replace(/^["']|["']$/g, '').trim();
        token = token.replace(/;+$/, '').trim();
        auth = `Bearer ${token}`;
      }

      req.headers.authorization = auth;
      return;
    }

    const cookieHeader = req.headers.cookie;
    if (!cookieHeader) {
      return;
    }

    const match = cookieHeader.match(/(?:^|;\s*)access_token=([^;]+)/);
    if (match?.[1]) {
      let token = decodeURIComponent(match[1]).trim();
      token = token.replace(/^["']|["']$/g, '').trim();
      token = token.replace(/;+$/, '').trim();
      req.headers.authorization = `Bearer ${token}`;
    }
  }
}
