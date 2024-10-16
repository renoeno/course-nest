import { Global, Module } from '@nestjs/common';
import { HashingService } from './hashing/hashing.service';
import { BcryptService } from './hashing/bcrypts.service';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Person } from 'src/persons/entities/person.entity';
import { ConfigModule } from '@nestjs/config';
import jwtConfig from './config/jwt.config';
import { JwtModule } from '@nestjs/jwt';

@Global()
@Module({
  imports: [
    TypeOrmModule.forFeature([Person]),
    ConfigModule.forFeature(jwtConfig),
    JwtModule.registerAsync(jwtConfig.asProvider()),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    {
      provide: HashingService,
      useClass: BcryptService,
    },
  ],
  exports: [HashingService, JwtModule, ConfigModule, TypeOrmModule],
})
export class AuthModule {}
