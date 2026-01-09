import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
    private readonly logger = new Logger(AllExceptionsFilter.name);

    constructor(private readonly httpAdapterHost: HttpAdapterHost) { }

    catch(exception: unknown, host: ArgumentsHost): void {
        const { httpAdapter } = this.httpAdapterHost;
        const ctx = host.switchToHttp();

        const httpStatus =
            exception instanceof HttpException
                ? exception.getStatus()
                : HttpStatus.INTERNAL_SERVER_ERROR;

        const responseBody = {
            statusCode: httpStatus,
            timestamp: new Date().toISOString(),
            path: httpAdapter.getRequestUrl(ctx.getRequest()),
            message: 'Internal Server Error',
        };

        if (exception instanceof HttpException) {
            const res = exception.getResponse();
            responseBody.message = typeof res === 'string' ? res : (res as any).message || res;
        } else {
            // Log the real error stack server-side
            console.error('Unhandled Exception:', exception);
            this.logger.error('Unhandled Exception', exception);

            // In production, keep message generic to avoid leaking internals
            // But for development/debugging phases, we might want to see it if safe
            if (process.env.NODE_ENV !== 'production') {
                responseBody.message = (exception as Error).message || 'Unknown error';
            }
        }

        httpAdapter.reply(ctx.getResponse(), responseBody, httpStatus);
    }
}
