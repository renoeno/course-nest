import {
  Inject,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { LoginDto } from './dto/login.dto';
import { Repository } from 'typeorm';
import { Person } from 'src/persons/entities/person.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { HashingService } from './hashing/hashing.service';
import jwtConfig from './config/jwt.config';
import { ConfigType } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(Person)
    private readonly personRepository: Repository<Person>,
    private readonly hashingService: HashingService,
    @Inject(jwtConfig.KEY)
    private readonly jwtConfiguration: ConfigType<typeof jwtConfig>,
    private readonly jwtService: JwtService,
  ) {}

  async login(loginDto: LoginDto) {
    let passwordIsValid = false;

    const person = await this.personRepository.findOneBy({
      email: loginDto.email,
      active: true,
    });

    if (!person) {
      throw new NotFoundException('User not authorized');
    }

    passwordIsValid = await this.hashingService.compare(
      loginDto.password,
      person.passwordHash,
    );

    if (!passwordIsValid) {
      throw new UnauthorizedException('Invalid user or password');
    }

    return this.createTokens(person);
  }

  async refreshToken(refreshToken: string) {
    try {
      const { sub } = await this.jwtService.verifyAsync(
        refreshToken,
        this.jwtConfiguration,
      );

      const person = await this.personRepository.findOneBy({
        id: sub,
        active: true,
      });

      if (!person) {
        throw new NotFoundException('User not authorized');
      }

      return this.createTokens(person);
    } catch (error) {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  private async createTokens(person: Person) {
    const token = await this.signJwtAsync<Partial<Person>>(
      person.id,
      this.jwtConfiguration.jwtTtl,
      {
        email: person.email,
      },
    );

    const refreshToken = await this.signJwtAsync<Partial<Person>>(
      person.id,
      this.jwtConfiguration.jwtRefreshTtl,
    );

    return {
      token,
      refreshToken,
    };
  }

  private async signJwtAsync<T>(sub: number, expiresIn: number, payload?: T) {
    return await this.jwtService.signAsync(
      {
        sub,
        ...payload,
      },
      {
        audience: this.jwtConfiguration.audience,
        issuer: this.jwtConfiguration.issuer,
        secret: this.jwtConfiguration.secret,
        expiresIn: expiresIn,
      },
    );
  }
}
