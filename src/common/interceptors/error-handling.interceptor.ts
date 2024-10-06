import {
  BadRequestException,
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { catchError, tap, throwError } from 'rxjs';

@Injectable()
export class ErrorHandlingInterceptor implements NestInterceptor {
  async intercept(context: ExecutionContext, next: CallHandler) {
    const response = context.switchToHttp().getResponse();

    await new Promise((resolve) => setTimeout(resolve, 1000));

    return next.handle().pipe(
      catchError((error) => {
        console.log('Error caught in interceptor', error);
        return throwError(() => {
          if (error.name === 'NotFoundException') {
            return new BadRequestException(error.message);
          }
        });
      }),
    );
  }
}
