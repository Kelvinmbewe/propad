import {
    Injectable,
    NestInterceptor,
    ExecutionContext,
    CallHandler,
    Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
    private readonly logger = new Logger('HTTP');

    intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
        const request = context.switchToHttp().getRequest();
        const { method, url, body, user } = request;
        const requestId = uuidv4();
        const startTime = Date.now();

        // Attach request ID to request object for downstream use
        request.headers['x-request-id'] = requestId;

        return next.handle().pipe(
            tap({
                next: (data) => {
                    const duration = Date.now() - startTime;
                    const response = context.switchToHttp().getResponse();
                    const statusCode = response.statusCode;

                    this.log(requestId, method, url, statusCode, duration, user?.id, body);
                },
                error: (error) => {
                    const duration = Date.now() - startTime;
                    const statusCode = error.status || 500;

                    this.log(requestId, method, url, statusCode, duration, user?.id, body, error.message);
                },
            }),
        );
    }

    private log(
        requestId: string,
        method: string,
        url: string,
        statusCode: number,
        duration: number,
        userId?: string,
        body?: any,
        errorMessage?: string,
    ) {
        const logPayload = {
            requestId,
            method,
            url,
            statusCode,
            durationMs: duration,
            userId: userId || 'anonymous',
            timestamp: new Date().toISOString(),
            error: errorMessage,
            // Avoid logging sensitive body fields
            // body: this.sanitize(body), 
        };

        if (statusCode >= 500) {
            this.logger.error(JSON.stringify(logPayload));
        } else if (statusCode >= 400) {
            this.logger.warn(JSON.stringify(logPayload));
        } else {
            this.logger.log(JSON.stringify(logPayload));
        }
    }

    // private sanitize(body: any) {
    //   if (!body) return undefined;
    //   const sanitized = { ...body };
    //   if (sanitized.password) sanitized.password = '***';
    //   if (sanitized.token) sanitized.token = '***';
    //   return sanitized;
    // }
}
