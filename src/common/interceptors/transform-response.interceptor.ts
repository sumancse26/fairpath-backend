import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { map, type Observable } from 'rxjs';
import { RESPONSE_MESSAGE_KEY } from '../decorators/response-message.decorator.js';
import type { ApiResponse } from '../interfaces/api-response.interface.js';

/**
 * Global interceptor that wraps every successful response in a standard format:
 *
 * {
 *   success: true,
 *   statusCode: 200,
 *   message: 'Success',
 *   data: { ... }
 * }
 *
 * Supports paginated responses with top-level `meta`.
 * Use `@ResponseMessage('Custom message')` on a route to override the default message.
 */
@Injectable()
export class TransformResponseInterceptor<T>
  implements NestInterceptor<T, ApiResponse<T>>
{
  constructor(private readonly reflector: Reflector) {}

  intercept(
    context: ExecutionContext,
    next: CallHandler<T>,
  ): Observable<ApiResponse<T>> {
    const message =
      this.reflector.get<string>(
        RESPONSE_MESSAGE_KEY,
        context.getHandler(),
      ) ?? 'Success';

    const statusCode = context.switchToHttp().getResponse().statusCode;

    return next.handle().pipe(
      map((res: any) => {
        if (res && typeof res === 'object' && 'data' in res && 'meta' in res) {
          return {
            success: true,
            statusCode,
            message,
            data: res.data,
            meta: res.meta,
          };
        }

        return {
          success: true,
          statusCode,
          message,
          data: res,
        };
      }),
    );
  }
}
