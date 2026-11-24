import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import type { Response } from 'express';

type ErrorResponse = {
  success: false;
  statusCode: number;
  message: string | string[];
  data: null;
};

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const context = host.switchToHttp();
    const response = context.getResponse<Response>();

    let statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: string | string[] = 'Internal server error';

    if (exception instanceof HttpException) {
      statusCode = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
      } else if (exceptionResponse && typeof exceptionResponse === 'object') {
        const responseMessage = (exceptionResponse as { message?: unknown })
          .message;

        if (Array.isArray(responseMessage)) {
          message = responseMessage.map(String);
        } else if (typeof responseMessage === 'string') {
          message = responseMessage;
        }
      }
    }

    const errorResponse: ErrorResponse = {
      success: false,
      statusCode,
      message,
      data: null,
    };

    response.status(statusCode).json(errorResponse);
  }
}
