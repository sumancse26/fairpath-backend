import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';

/**
 * Extracts a cookie value by name from the request headers.
 *
 * @example
 * ```ts
 * @Get()
 * findAll(@Cookie('user_id') userId?: string) {}
 * ```
 */
export const Cookie = createParamDecorator(
  (name: string, ctx: ExecutionContext): string | undefined => {
    const request = ctx.switchToHttp().getRequest<Request>();
    const cookieHeader = request?.headers?.cookie;
    if (!cookieHeader) return undefined;

    const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${name}=([^;]+)`));
    return match ? decodeURIComponent(match[1]) : undefined;
  },
);
