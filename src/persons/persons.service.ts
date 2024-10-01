import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreatePersonDto } from './dto/create-person.dto';
import { UpdatePersonDto } from './dto/update-person.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Person } from './entities/person.entity';
import { Repository } from 'typeorm';

@Injectable()
export class PersonsService {
  constructor(
    @InjectRepository(Person)
    private readonly personRepository: Repository<Person>,
  ) {}
  async create(createPersonDto: CreatePersonDto) {
    try {
      const personData = {
        name: createPersonDto.name,
        email: createPersonDto.email,
        passwordHash: createPersonDto.password,
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

  async update(id: number, updatePersonDto: UpdatePersonDto) {
    const person = await this.personRepository.preload({
      id,
      ...updatePersonDto,
    });

    if (!person) {
      throw new NotFoundException('Person not found');
    }

    return this.personRepository.save(person);
  }

  async remove(id: number) {
    const person = await this.personRepository.findOne({
      where: { id },
    });

    if (!person) {
      throw new NotFoundException('Person not found');
    }

    return this.personRepository.delete(id);
  }
}
