import { Injectable } from '@nestjs/common';
import { AuthenticationGuard } from '@nestjs/authentication';

/**
 * Global JWT authentication guard.
 * All routes are protected by default.
 * Use `@Public()` to opt out individual routes.
 */
@Injectable()
export class JwtAuthGuard extends AuthenticationGuard {}
