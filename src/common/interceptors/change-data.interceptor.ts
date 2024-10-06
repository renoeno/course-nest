import {
  BadRequestException,
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { catchError, map, of, tap, throwError } from 'rxjs';

@Injectable()
export class ChangeDataInterceptor implements NestInterceptor {
  private readonly cache = new Map();

  async intercept(context: ExecutionContext, next: CallHandler) {
    return next.handle().pipe(
      map((data) => {
        if (Array.isArray(data)) {
          return {
            data,
            count: data.length,
          };
        }

        return data;
      }),
    );
  }
}
