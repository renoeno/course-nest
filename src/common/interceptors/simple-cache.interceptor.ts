import {
  BadRequestException,
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { catchError, of, tap, throwError } from 'rxjs';

@Injectable()
export class SimpleCacheInterceptor implements NestInterceptor {
  private readonly cache = new Map();

  async intercept(context: ExecutionContext, next: CallHandler) {
    const request = context.switchToHttp().getRequest();
    const url = request.url;

    if (this.cache.has(url)) {
      return of(this.cache.get(url));
    }

    return next.handle().pipe(
      tap((data) => {
        this.cache.set(url, data);
        console.log('Stored in cache ', url);
      }),
    );
  }
}
