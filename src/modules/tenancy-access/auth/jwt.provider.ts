import { Injectable } from '@nestjs/common';
import {
  AuthenticationRegistry,
  JwtBearerProvider,
  type JwtClaims,
} from '@nestjs/authentication';
import { AuthService } from './auth.service.js';
import type { AuthUser } from './types/auth.types.js';

@Injectable()
export class JwtAuthProvider extends JwtBearerProvider<AuthUser> {
  constructor(
    private readonly authService: AuthService,
    registry: AuthenticationRegistry,
  ) {
    super();
    registry.registerProvider(this);
  }

  protected async validate(claims: JwtClaims): Promise<AuthUser | null> {
    if (!claims.sub) {
      return null;
    }
    return this.authService.validateUserById(claims.sub);
  }
}

