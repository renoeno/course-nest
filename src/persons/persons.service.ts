import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreatePersonDto } from './dto/create-person.dto';
import { UpdatePersonDto } from './dto/update-person.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Person } from './entities/person.entity';
import { Repository } from 'typeorm';
import { HashingService } from 'src/auth/hashing/hashing.service';
import { TokenPayloadDto } from 'src/auth/dto/token-payload.dto';

@Injectable()
export class PersonsService {
  constructor(
    @InjectRepository(Person)
    private readonly personRepository: Repository<Person>,
    private readonly hashingService: HashingService,
  ) {}
  async create(createPersonDto: CreatePersonDto) {
    try {
      const passwordHash = await this.hashingService.hash(
        createPersonDto.password,
      );
      const personData = {
        name: createPersonDto.name,
        email: createPersonDto.email,
        passwordHash: passwordHash,
      };

      const newPerson = this.personRepository.create(personData);

      await this.personRepository.save(newPerson);

      return newPerson;
    } catch (error) {
      if (error.code === '23505') {
        throw new ConflictException('Email already in use');
      }

      throw error;
    }
  }

  async findAll() {
    const persons = await this.personRepository.find({
      order: {
        id: 'DESC',
      },
    });

    return persons;
  }

  async findOne(id: number) {
    const person = await this.personRepository.findOne({
      where: { id },
    });

    if (!person) {
      throw new NotFoundException('Person not found');
    }

    return person;
  }

  async update(
    id: number,
    updatePersonDto: UpdatePersonDto,
    tokenPayload: TokenPayloadDto,
  ) {
    if (updatePersonDto.password) {
      const passwordHash = await this.hashingService.hash(
        updatePersonDto.password,
      );

      updatePersonDto['passwordHash'] = passwordHash;
    }

    const person = await this.personRepository.preload({
      id,
      ...updatePersonDto,
    });

    if (person.id !== tokenPayload.sub) {
      throw new ForbiddenException('You can only update your own data');
    }

    if (!person) {
      throw new NotFoundException('Person not found');
    }

    return this.personRepository.save(person);
  }

  async remove(id: number, tokenPayload: TokenPayloadDto) {
    const person = await this.personRepository.findOne({
      where: { id },
    });

    if (!person) {
      throw new NotFoundException('Person not found');
    }

    if (person.id !== tokenPayload.sub) {
      throw new ForbiddenException('You can only update your own data');
    }

    return this.personRepository.delete(id);
  }
}
