import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';
import { Observable } from 'rxjs';
import jwtConfig from '../config/jwt.config';
import { ConfigType } from '@nestjs/config';
import { REQUEST_TOKEN_PAYLOAD_KEY } from '../auth.contants';
import { InjectRepository } from '@nestjs/typeorm';
import { Person } from 'src/persons/entities/person.entity';
import { Repository } from 'typeorm';

@Injectable()
export class AuthTokenGuard implements CanActivate {
  constructor(
    @InjectRepository(Person)
    private readonly personRepository: Repository<Person>,
    private readonly jwtService: JwtService,
    @Inject(jwtConfig.KEY)
    private readonly jwtConfiguration: ConfigType<typeof jwtConfig>,
  ) {}
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request: Request = context.switchToHttp().getRequest();
    const token = this.extractTokenFromHeader(request);

    if (!token) {
      throw new UnauthorizedException('User not authorized');
    }

    try {
      const payload = await this.jwtService.verifyAsync(token);

      const person = await this.personRepository.findOneBy({
        id: payload.sub,
        active: true,
      });

      if (!person) {
        throw new UnauthorizedException('User not authorized');
      }

      request['person'] = person;

      request[REQUEST_TOKEN_PAYLOAD_KEY] = payload;
    } catch (error) {
      throw new UnauthorizedException('Error logging in');
    }

    return true;
  }

  extractTokenFromHeader(request: Request): string {
    const authorization = request.headers['authorization'];

    if (!authorization || typeof authorization !== 'string') {
      return;
    }

    const [type, token] = authorization.split(' ');

    if (type !== 'Bearer') {
      return;
    }

    return token;
  }
}
