import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import {
  AuthenticationGuard,
  AuthenticationModule,
  type AuthenticationModuleOptions,
} from '@nestjs/authentication';
import { createObserveModule } from '@nestjs/observe';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { DatabaseModule } from './database/database.module.js';
import { AuthModule } from './modules/auth/auth.module.js';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard.js';
import { TransformResponseInterceptor } from './common/interceptors/transform-response.interceptor.js';

export const { ObserveModule, ObserveInstrument } = createObserveModule();

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    ObserveModule.forRoot({
      appKey: process.env.OBSERVE_APP_KEY ?? '',
      appSecret: process.env.OBSERVE_APP_SECRET ?? '',
      serviceId: 'fairpath-backend',
    }),
    AuthenticationModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService): AuthenticationModuleOptions => {
        const key = config.get<string>('JWT_SECRET') || '';
        const issuer = config.get<string>('JWT_ISSUER') || undefined;
        const ttl = (config.get<string>('JWT_EXPIRES_IN') || '') as any;
        const refreshTtl = (config.get<string>('JWT_REFRESH_EXPIRES_IN') ||
          '') as any;

        return {
          accessToken: {
            key,
            ...(issuer ? { issuer } : {}),
            ttl,
          },
          refreshToken: {
            ttl: refreshTtl,
          },
          allowInMemoryStorage: true,
        };
      },
    }),
    DatabaseModule,
    AuthModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: AuthenticationGuard,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: TransformResponseInterceptor,
    },
  ],
})
export class AppModule {}
