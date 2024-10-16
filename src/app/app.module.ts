import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { MessagesModule } from 'src/messages/messages.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { PersonsModule } from 'src/persons/persons.module';
import * as Joi from '@hapi/joi';
import { AuthModule } from 'src/auth/auth.module';
import { ServeStaticModule } from '@nestjs/serve-static';
import * as path from 'path';

@Module({
  imports: [
    ConfigModule.forRoot({
      validationSchema: Joi.object({
        DATABASE_TYPE: Joi.required(),
        DATABASE_HOST: Joi.required(),
        DATABASE_PORT: Joi.number().default(5432),
        DATABASE_USERNAME: Joi.required(),
        DATABASE_PASSWORD: Joi.required(),
        DATABASE_DATABASE: Joi.required(),
        DATABASE_AUTOLOADENTITIES: Joi.number().default(0),
        DATABASE_SYNCHRONIZE: Joi.number().default(0),
      }),
    }),
    TypeOrmModule.forRoot({
      type: process.env.DATABASE_TYPE as 'postgres',
      host: process.env.DATABASE_HOST,
      port: parseInt(process.env.DATABASE_PORT, 10),
      username: process.env.DATABASE_USERNAME,
      password: String(process.env.DATABASE_PASSWORD),
      database: process.env.DATABASE_DATABASE,
      autoLoadEntities: Boolean(process.env.DATABASE_AUTOLOADENTITIES),
      synchronize: Boolean(process.env.DATABASE_SYNCHRONIZE),
    }),
    ServeStaticModule.forRoot({
      rootPath: path.resolve(__dirname, '..', '..', 'pictures'),
      serveRoot: '/pictures',
    }),
    MessagesModule,
    PersonsModule,
    AuthModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
