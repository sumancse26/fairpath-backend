import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Ip,
  Post,
  Req,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service.js';
import { loginSchema, type LoginDto } from './dto/login.dto.js';
import { refreshTokenSchema, type RefreshTokenDto } from './dto/refresh-token.dto.js';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard.js';
import { Public } from '../../common/decorators/public.decorator.js';
import { CurrentUser } from '../../common/decorators/current-user.decorator.js';
import { ResponseMessage } from '../../common/decorators/response-message.decorator.js';
import type { AuthUser } from './types/auth.types.js';

@Controller('auth')
export class AuthController {
  private readonly cookieDomain: string;
  private readonly cookieSecure: boolean;

  constructor(
    private readonly authService: AuthService,
    private readonly config: ConfigService,
  ) {
    this.cookieDomain = this.config.get<string>('COOKIE_DOMAIN') || 'localhost';
    this.cookieSecure = this.config.get<string>('COOKIE_SECURE') === 'true';
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ResponseMessage('Login successful')
  async login(
    @Body({ schema: loginSchema }) dto: LoginDto,
    @Ip() ip: string,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.login(dto, ip);

    this.setTokenCookies(res, result.accessToken, result.refreshToken, result.user);

    return {
      user: result.user,
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
      expiresIn: result.expiresIn,
    };
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ResponseMessage('Token refreshed successfully')
  async refresh(
    @Body({ schema: refreshTokenSchema }) dto: RefreshTokenDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const token = dto.refreshToken || this.extractCookie(req, 'refresh_token');

    if (!token) {
      throw new UnauthorizedException('Refresh token is required');
    }

    const result = await this.authService.refresh(token);

    this.setTokenCookies(res, result.accessToken, result.refreshToken);

    return {
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
      expiresIn: result.expiresIn,
    };
  }

  @Public()
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ResponseMessage('Logged out successfully')
  async logout(
    @Body({ schema: refreshTokenSchema }) dto: RefreshTokenDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const token = dto.refreshToken || this.extractCookie(req, 'refresh_token');

    if (token) {
      await this.authService.logout(token);
    }
    this.clearTokenCookies(res);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ResponseMessage('User profile retrieved')
  getMe(@CurrentUser() user: AuthUser) {
    return { user };
  }

  private extractCookie(req: Request, name: string): string | undefined {
    const cookieHeader = req?.headers?.cookie;
    if (!cookieHeader) return undefined;
    const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${name}=([^;]+)`));
    return match ? decodeURIComponent(match[1]) : undefined;
  }

  private setTokenCookies(
    res: Response,
    accessToken: string,
    refreshToken: string,
    user?: AuthUser,
  ): void {
    const baseOptions = {
      secure: this.cookieSecure,
      domain: this.cookieDomain,
      sameSite: 'lax' as const,
      path: '/',
    };

    res.cookie('access_token', accessToken, {
      ...baseOptions,
      httpOnly: true,
      maxAge: 15 * 60 * 1000, // 15 minutes
    });

    res.cookie('refresh_token', refreshToken, {
      ...baseOptions,
      httpOnly: true,
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      path: '/api', // Accessible across API versions
    });

    if (user) {
      const userCookieOptions = {
        ...baseOptions,
        httpOnly: false,
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      };

      res.cookie('user_id', user.id, userCookieOptions);

      const role = user.roleName || user.roleId;
      if (role) {
        res.cookie('role', role, userCookieOptions);
      }
      if (user.roleId) {
        res.cookie('role_id', user.roleId, userCookieOptions);
      }
      if (user.tenantId) {
        res.cookie('tenant_id', user.tenantId, userCookieOptions);
      } else {
        res.clearCookie('tenant_id', { ...baseOptions, httpOnly: false });
      }
    }
  }

  private clearTokenCookies(res: Response): void {
    const baseOptions = {
      secure: this.cookieSecure,
      domain: this.cookieDomain,
      sameSite: 'lax' as const,
      path: '/',
    };

    res.clearCookie('access_token', { ...baseOptions, httpOnly: true });
    res.clearCookie('refresh_token', { ...baseOptions, httpOnly: true, path: '/api' });
    res.clearCookie('user_id', { ...baseOptions, httpOnly: false });
    res.clearCookie('role', { ...baseOptions, httpOnly: false });
    res.clearCookie('role_id', { ...baseOptions, httpOnly: false });
    res.clearCookie('tenant_id', { ...baseOptions, httpOnly: false });
  }
}
