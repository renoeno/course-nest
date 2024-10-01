import { Injectable, NotFoundException } from '@nestjs/common';
import { Message } from './entities/message.entity';
import { CreateMessageDto } from './dto/create-message.dto';
import { UpdateMessageDto } from './dto/update-message.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PersonsService } from 'src/persons/persons.service';
import { PaginationDto } from 'src/common/dto/pagination.dto';

@Injectable()
export class MessagesService {
  constructor(
    @InjectRepository(Message)
    private readonly messageRepository: Repository<Message>,
    private readonly personsService: PersonsService,
  ) {}

  async findAll(paginationDto?: PaginationDto) {
    const { limit = 10, offset = 0 } = paginationDto;

    const messages = await this.messageRepository.find({
      take: limit,
      skip: offset,
      relations: ['sender', 'receiver'],
      order: {
        id: 'DESC',
      },
      select: {
        sender: {
          id: true,
          name: true,
        },
        receiver: {
          id: true,
          name: true,
        },
      },
    });

    return messages;
  }

  async findOne(id: number) {
    const message = await this.messageRepository.findOne({
      where: { id },
    });

    if (!message) {
      throw new NotFoundException('Message not found');
    }

    return message;
  }

  async create(createMessageDto: CreateMessageDto) {
    const { senderId, receiverId } = createMessageDto;

    const sender = await this.personsService.findOne(senderId);

    const receiver = await this.personsService.findOne(receiverId);

    const newMessage = {
      message: createMessageDto.message,
      receiver: receiver,
      sender: sender,
    };

    this.messageRepository.create(createMessageDto);
    await this.messageRepository.save(newMessage);

    return {
      ...newMessage,
      sender: {
        id: newMessage.sender.id,
      },
      receiver: {
        id: newMessage.receiver.id,
      },
    };
  }

  async update(id: number, updateMessageDto: UpdateMessageDto) {
    const updatedMessage = await this.messageRepository.findOne({
      where: { id },
    });

    updatedMessage.message = updateMessageDto.message ?? updatedMessage.message;
    updatedMessage.read = updateMessageDto.read ?? updatedMessage.read;

    return this.messageRepository.save(updatedMessage);
  }

  async delete(id: number) {
    const deletedMessage = this.messageRepository.findOne({
      where: { id },
    });

    if (!deletedMessage) {
      throw new NotFoundException('Message not found');
    }

    return this.messageRepository.delete(id);
  }
}
