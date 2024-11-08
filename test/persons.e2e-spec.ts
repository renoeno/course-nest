import { Test, TestingModule } from '@nestjs/testing';
import { HttpStatus, INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { ConfigModule } from '@nestjs/config';
import { ServeStaticModule } from '@nestjs/serve-static';
import { TypeOrmModule } from '@nestjs/typeorm';
import * as path from 'path';
import { AuthModule } from 'src/auth/auth.module';
import { MessagesModule } from 'src/messages/messages.module';
import { PersonsModule } from 'src/persons/persons.module';
import { ParseIntIdPipe } from 'src/common/pipes/parse-int-id.pipe';
import appConfig from 'src/app/config/app.config';
import { CreatePersonDto } from 'src/persons/dto/create-person.dto';
import { AppModule } from 'src/app/app.module';

const login = async (
  app: INestApplication,
  email: string,
  password: string,
) => {
  const response = await request(app.getHttpServer()).post('/auth/login').send({
    email,
    password,
  });

  return response.body.token;
};

const createPersonAndLogin = async (app: INestApplication) => {
  const createPersonDto: CreatePersonDto = {
    email: 'mail@mail.com',
    password: 'password',
    name: 'name',
  };

  await request(app.getHttpServer()).post('/persons').send(createPersonDto);

  return login(app, createPersonDto.email, createPersonDto.password);
};

describe('AppController (e2e)', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot({
          type: 'postgres',
          host: 'localhost',
          port: 5432,
          username: 'reno',
          password: 'password',
          database: 'testing',
          autoLoadEntities: true,
          synchronize: true,
          dropSchema: true,
        }),
        ServeStaticModule.forRoot({
          rootPath: path.resolve(__dirname, '..', '..', 'pictures'),
          serveRoot: '/pictures',
        }),
        MessagesModule,
        PersonsModule,
        AppModule,
      ],
    }).compile();

    app = moduleFixture.createNestApplication();

    appConfig(app);

    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  describe('/persons (POST)', () => {
    it('should create a person', async () => {
      const createPersonDto: CreatePersonDto = {
        email: 'mail@mail.com',
        password: 'password',
        name: 'name',
      };
      const response = await request(app.getHttpServer())
        .post('/persons')
        .send(createPersonDto);

      expect(response.status).toBe(HttpStatus.CREATED);
      expect(response.body).toEqual({
        email: createPersonDto.email,
        passwordHash: expect.any(String),
        name: createPersonDto.name,
        active: true,
        created_at: expect.any(String),
        updated_at: expect.any(String),
        id: expect.any(Number),
        picture: '',
      });
    });

    it('should throw an error when email is already used', async () => {
      const createPersonDto: CreatePersonDto = {
        email: 'luiz@email.com',
        name: 'Luiz',
        password: '123456',
      };

      await request(app.getHttpServer())
        .post('/persons')
        .send(createPersonDto)
        .expect(HttpStatus.CREATED);

      const response = await request(app.getHttpServer())
        .post('/persons')
        .send(createPersonDto)
        .expect(HttpStatus.CONFLICT);

      expect(response.body.message).toBe('Email already in use');
    });

    it('should throw an error is password is too short', async () => {
      const createPersonDto: CreatePersonDto = {
        email: 'luiz@email.com',
        name: 'Luiz',
        password: '123', // Este campo é inválido
      };

      const response = await request(app.getHttpServer())
        .post('/persons')
        .send(createPersonDto)
        .expect(HttpStatus.BAD_REQUEST);

      expect(response.body.message).toEqual([
        'password must be longer than or equal to 5 characters',
      ]);
      expect(response.body.message).toContain(
        'password must be longer than or equal to 5 characters',
      );
    });
  });

  describe('/persons/:id (GET)', () => {
    it('should throw error when user is not logged', async () => {
      const createPersonDto: CreatePersonDto = {
        email: 'mail@mail.com',
        password: 'password',
        name: 'name',
      };

      await request(app.getHttpServer()).post('/persons').send(createPersonDto);

      const response = await request(app.getHttpServer()).get('/persons/1');

      expect(response.status).toBe(HttpStatus.UNAUTHORIZED);
      expect(response.body).toEqual({
        error: 'Unauthorized',
        message: 'User not authorized',
        statusCode: 401,
      });
    });

    it('should return an user', async () => {
      const createPersonDto: CreatePersonDto = {
        email: 'mail@mail.com',
        password: 'password',
        name: 'name',
      };

      await request(app.getHttpServer()).post('/persons').send(createPersonDto);

      const token = await createPersonAndLogin(app);

      const response = await request(app.getHttpServer())
        .get('/persons/1')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(HttpStatus.OK);
      expect(response.body).toEqual({
        email: createPersonDto.email,
        passwordHash: expect.any(String),
        name: createPersonDto.name,
        active: true,
        created_at: expect.any(String),
        updated_at: expect.any(String),
        id: expect.any(Number),
        picture: '',
      });
    });

    it('should generate an error when a person is not found', async () => {
      const token = await createPersonAndLogin(app);

      const response = await request(app.getHttpServer())
        .get('/persons/999')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(HttpStatus.NOT_FOUND);
      expect(response.body).toEqual({
        error: 'Not Found',
        message: 'Person not found',
        statusCode: 404,
      });
    });
  });

  describe('GET /persons', () => {
    it('should return all persons', async () => {
      await request(app.getHttpServer())
        .post('/persons')
        .send({
          email: 'luiz@email.com',
          name: 'Luiz',
          password: '123456',
        })
        .expect(HttpStatus.CREATED);

      const token = await createPersonAndLogin(app);

      const response = await request(app.getHttpServer())
        .get('/persons')
        .set('Authorization', `Bearer ${token}`)
        .expect(HttpStatus.OK);

      expect(response.body).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: expect.any(Number),
            email: 'luiz@email.com',
            name: 'Luiz',
          }),
        ]),
      );
    });
  });

  describe('PATCH /persons/:id', () => {
    it('should update a person', async () => {
      const createResponse = await request(app.getHttpServer())
        .post('/persons')
        .send({
          email: 'luiz@email.com',
          name: 'Luiz',
          password: '123456',
        })
        .expect(HttpStatus.CREATED);

      const personId = createResponse.body.id;

      const authToken = await login(app, 'luiz@email.com', '123456');

      const updateResponse = await request(app.getHttpServer())
        .patch(`/persons/${personId}`)
        .send({
          name: 'Luiz Atualizado',
        })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(HttpStatus.OK);

      expect(updateResponse.body).toEqual(
        expect.objectContaining({
          id: personId,
          name: 'Luiz Atualizado',
        }),
      );
    });

    it('should generate an error when a person is not found', async () => {
      const token = await createPersonAndLogin(app);
      await request(app.getHttpServer())
        .patch('/persons/9999') // ID fictício
        .send({
          name: 'Nome Atualizado',
        })
        .set('Authorization', `Bearer ${token}`)
        .expect(HttpStatus.NOT_FOUND);
    });
  });

  describe('DELETE /persons/:id', () => {
    it('should remove a person', async () => {
      const createResponse = await request(app.getHttpServer())
        .post('/persons')
        .send({
          email: 'luiz@email.com',
          name: 'Luiz',
          password: '123456',
        })
        .expect(HttpStatus.CREATED);

      const authToken = await login(app, 'luiz@email.com', '123456');

      const personId = createResponse.body.id;

      const response = await request(app.getHttpServer())
        .delete(`/persons/${personId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(HttpStatus.OK);
    });

    it('should generate an error when a person is not found', async () => {
      const token = await createPersonAndLogin(app);
      await request(app.getHttpServer())
        .delete('/persons/9999') // ID fictício
        .set('Authorization', `Bearer ${token}`)
        .expect(HttpStatus.NOT_FOUND);
    });
  });
});
