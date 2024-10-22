import { Repository } from 'typeorm';
import { PersonsService } from './persons.service';
import { Person } from './entities/person.entity';
import { HashingService } from 'src/auth/hashing/hashing.service';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { CreatePersonDto } from './dto/create-person.dto';
import exp from 'constants';

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
  });
});
