import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';

@Injectable()
export class TimingConnectionInterceptor implements NestInterceptor {
  async intercept(context: ExecutionContext, next: CallHandler) {
    const response = context.switchToHttp().getResponse();

    await new Promise((resolve) => setTimeout(resolve, 1000));

    return next.handle().pipe(tap(() => console.log('After...')));
  }
}
