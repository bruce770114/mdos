import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { I18nService } from '../services/i18n.service';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);
  private readonly i18n = new I18nService();

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    // Get language from header or user
    const lang = this.i18n.parseAcceptLanguage(
      request.headers['accept-language'] as string,
    );

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const messageData =
      exception instanceof HttpException
        ? exception.getResponse()
        : { message: 'Internal server error' };

    // Extract message and try to translate
    let message: string | unknown;
    if (typeof messageData === 'object' && messageData !== null) {
      const msg = (messageData as Record<string, unknown>)['message'];
      // If it's a string, try to translate it
      if (typeof msg === 'string') {
        // Check if it's a translation key (contains .)
        message = msg.includes('.') ? this.i18n.translate(msg, lang) : msg;
      } else {
        message = msg;
      }
    } else {
      message = messageData;
    }

    this.logger.error(
      `${request.method} ${request.url} - ${status}`,
      exception instanceof Error ? exception.stack : String(exception),
    );

    response.status(status).json({
      code: status,
      message,
      data: null,
      timestamp: new Date().toISOString(),
      path: request.url,
      lang, // Include language in response for debugging
    });
  }
}
