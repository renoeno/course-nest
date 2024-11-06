import { Not, Repository } from 'typeorm';
import { PersonsService } from './persons.service';
import { Person } from './entities/person.entity';
import { HashingService } from 'src/auth/hashing/hashing.service';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { CreatePersonDto } from './dto/create-person.dto';
import exp from 'constants';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import e from 'express';
import * as path from 'path';
import * as fs from 'fs/promises';

jest.mock('fs/promises');

describe('PersonsService', () => {
  let service: PersonsService;
  let personRepository: Repository<Person>;
  let hashingService: HashingService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PersonsService,
        {
          provide: getRepositoryToken(Person),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            findOne: jest.fn(),
            find: jest.fn(),
            preload: jest.fn(),
            delete: jest.fn(),
          },
        },
        {
          provide: HashingService,
          useValue: {
            hash: jest.fn().mockResolvedValue('hashedPassword'),
          },
        },
      ],
    }).compile();

    service = module.get<PersonsService>(PersonsService);
    personRepository = module.get<Repository<Person>>(
      getRepositoryToken(Person),
    );
    hashingService = module.get<HashingService>(HashingService);
  });

  it('personsService should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a new person', async () => {
      const createPersonDto: CreatePersonDto = {
        name: 'John Doe',
        email: 'john@mail.com',
        password: '123',
      };

      const hashedPassword = 'hashedPassword';

      const newPerson = {
        id: 1,
        name: createPersonDto.name,
        email: createPersonDto.email,
        passwordHash: hashedPassword,
      };

      jest.spyOn(hashingService, 'hash').mockResolvedValue(hashedPassword);
      jest.spyOn(personRepository, 'create').mockReturnValue(newPerson as any);

      const result = await service.create(createPersonDto);
      expect(hashingService.hash).toHaveBeenCalledWith(
        createPersonDto.password,
      );
      expect(personRepository.create).toHaveBeenCalledWith({
        name: createPersonDto.name,
        email: createPersonDto.email,
        passwordHash: 'hashedPassword',
      });

      expect(personRepository.save).toHaveBeenCalledWith(newPerson);
      expect(result).toEqual(newPerson);
    });

    it('shoult throw ConflictException when email is already in use', async () => {
      const createPersonDto: CreatePersonDto = {
        name: 'John Doe',
        email: 'john@mail.com',
        password: '123',
      };

      jest.spyOn(personRepository, 'save').mockRejectedValue({
        code: '23505',
      });
      await expect(service.create(createPersonDto)).rejects.toThrowError(
        ConflictException,
      );
    });

    it('shoult throw an generic error when theres an error', async () => {
      const createPersonDto: CreatePersonDto = {
        name: 'John Doe',
        email: 'john@mail.com',
        password: '123',
      };

      jest
        .spyOn(personRepository, 'save')
        .mockRejectedValue(new Error('Generic error'));
      await expect(service.create(createPersonDto)).rejects.toThrowError(
        new Error('Generic error'),
      );
    });
  });

  describe('findOne', () => {
    it('should return a person by id', async () => {
      const person = {
        id: 1,
        name: 'John Doe',
        email: 'mail@mail.com',
        passwordHash: 'hashedPassword',
      };

      jest.spyOn(personRepository, 'findOne').mockResolvedValue(person as any);

      const result = await service.findOne(person.id);

      expect(result).toEqual(person);
    });

    it('should throw NotFoundException when person is not found', async () => {
      const person = {
        id: 1,
        name: 'John Doe',
        email: 'mail@mail.com',
        passwordHash: 'hashedPassword',
      };

      await expect(service.findOne(person.id)).rejects.toThrowError(
        NotFoundException,
      );
    });
  });

  describe('findAll', () => {
    it('should return a list of persons', async () => {
      const persons: Person[] = [
        {
          id: 1,
          name: 'John Doe',
          email: '',
          passwordHash: '',
        } as Person,
      ];

      jest.spyOn(personRepository, 'find').mockResolvedValue(persons as any);

      const result = await service.findAll();

      expect(result).toEqual(persons);
      expect(personRepository.find).toHaveBeenCalledWith({
        order: {
          id: 'DESC',
        },
      });
    });
  });

  describe('update', () => {
    it('should update a authenticated person', async () => {
      const updatePersonDto = {
        name: 'John Doe',
        password: '123',
      };

      const tokenPayload = {
        sub: 1,
      };

      const passwordHash = 'hashedPassword';
      const updatedPerson = {
        id: 1,
        name: updatePersonDto.name,
        passwordHash,
      };

      jest.spyOn(hashingService, 'hash').mockResolvedValue(passwordHash);
      jest
        .spyOn(personRepository, 'preload')
        .mockResolvedValue(updatedPerson as any);
      jest
        .spyOn(personRepository, 'save')
        .mockResolvedValue(updatedPerson as any);

      const result = await service.update(
        1,
        updatePersonDto,
        tokenPayload as any,
      );

      expect(result).toEqual(updatedPerson);
      expect(hashingService.hash).toHaveBeenCalledWith(
        updatePersonDto.password,
      );
      expect(personRepository.preload).toHaveBeenCalledWith({
        id: 1,
        name: updatePersonDto.name,
        passwordHash,
      });
      expect(personRepository.save).toHaveBeenCalledWith(updatedPerson);
      expect(result).toEqual(updatedPerson);
    });

    it('should throw ForbiddenException when user try to update another person', async () => {
      const updatePersonDto = {
        id: 1,
        name: 'John Doe',
      };

      const tokenPayload = {
        sub: 2,
      };

      jest
        .spyOn(personRepository, 'preload')
        .mockResolvedValue(updatePersonDto as any);

      await expect(
        service.update(1, updatePersonDto, tokenPayload as any),
      ).rejects.toThrowError(ForbiddenException);
    });

    it('should throw NotFoundException when person does not exist', async () => {
      const updatePersonDto = {
        name: 'John Doe',
      };

      const tokenPayload = {
        sub: 1,
      };

      jest.spyOn(personRepository, 'preload').mockResolvedValue(null);

      await expect(
        service.update(1, updatePersonDto, tokenPayload as any),
      ).rejects.toThrowError(NotFoundException);
    });
  });

  describe('remove', () => {
    it('should remove a authorized person', async () => {
      const personId = 1;
      const removedPerson = {
        id: personId,
        name: 'John Doe',
      };

      const tokenPayload = {
        sub: personId,
      } as any;

      jest.spyOn(service, 'findOne').mockResolvedValue(removedPerson as any);
      jest
        .spyOn(personRepository, 'delete')
        .mockResolvedValue(removedPerson as any);

      const result = await service.remove(personId, tokenPayload);

      expect(service.findOne).toHaveBeenCalledWith(personId);
      expect(personRepository.delete).toHaveBeenCalledWith(removedPerson);
      expect(result).toEqual(removedPerson);
    });

    it('should throw ForbiddenException when user try to remove another person', async () => {
      const personId = 1;
      const removedPerson = {
        id: personId,
        name: 'John Doe',
      };

      const tokenPayload = {
        sub: 2,
      } as any;

      jest.spyOn(service, 'findOne').mockResolvedValue(removedPerson as any);

      await expect(service.remove(personId, tokenPayload)).rejects.toThrowError(
        ForbiddenException,
      );
    });

    it('should throw NotFoundException when person does not exist', async () => {
      const personId = 1;
      const tokenPayload = {
        sub: personId,
      } as any;

      jest.spyOn(service, 'findOne').mockResolvedValue(null);

      await expect(service.remove(personId, tokenPayload)).rejects.toThrowError(
        NotFoundException,
      );
    });
  });

  describe('upload picture', () => {
    it('should save picture and update person', async () => {
      const mockFile = {
        originalname: 'file.png',
        size: 1024,
        buffer: Buffer.from('file content'),
      } as Express.Multer.File;

      const mockedPerson = {
        id: 1,
        name: 'John Doe',
        email: 'mail@mail.com',
      } as Person;

      const tokenPayload = {
        sub: 1,
      } as any;

      jest.spyOn(service, 'findOne').mockResolvedValue(mockedPerson);
      jest.spyOn(personRepository, 'save').mockResolvedValue({
        ...mockedPerson,
        picture: '1.png',
      });

      const filePath = path.resolve(process.cwd(), 'pictures', '1.png');

      const result = await service.uploadPicture(mockFile, tokenPayload);

      expect(fs.writeFile).toHaveBeenCalledWith(filePath, mockFile.buffer);
      expect(personRepository.save).toHaveBeenCalledWith({
        ...mockedPerson,
        picture: '1.png',
      });

      expect(result).toEqual({
        ...mockedPerson,
        picture: '1.png',
      });
    });

    it('should throw BadRequestException when file size is too small', async () => {
      const mockFile = {
        originalname: 'file.png',
        size: 100,
        buffer: Buffer.from('file content'),
      } as Express.Multer.File;

      const tokenPayload = {
        sub: 1,
      } as any;

      await expect(
        service.uploadPicture(mockFile, tokenPayload),
      ).rejects.toThrowError(BadRequestException);
    });

    it('should throw NotFoundException when person does not exist', async () => {
      const mockFile = {
        originalname: 'file.png',
        size: 1024,
        buffer: Buffer.from('file content'),
      } as Express.Multer.File;

      const tokenPayload = {
        sub: 1,
      } as any;

      jest.spyOn(service, 'findOne').mockRejectedValue(new NotFoundException());

      await expect(
        service.uploadPicture(mockFile, tokenPayload),
      ).rejects.toThrowError(NotFoundException);
    });
  });
});
