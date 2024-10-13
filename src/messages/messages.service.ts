import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Message } from './entities/message.entity';
import { CreateMessageDto } from './dto/create-message.dto';
import { UpdateMessageDto } from './dto/update-message.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PersonsService } from 'src/persons/persons.service';
import { PaginationDto } from 'src/common/dto/pagination.dto';
import { TokenPayloadDto } from 'src/auth/dto/token-payload.dto';

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
      relations: ['sender', 'receiver'],
    });

    if (!message) {
      throw new NotFoundException('Message not found');
    }

    return message;
  }

  async create(
    createMessageDto: CreateMessageDto,
    tokenPayload: TokenPayloadDto,
  ) {
    const { receiverId } = createMessageDto;

    const sender = await this.personsService.findOne(tokenPayload.sub);

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

  async update(
    id: number,
    updateMessageDto: UpdateMessageDto,
    tokenPayload: TokenPayloadDto,
  ) {
    const updatedMessage = await this.findOne(id);

    if (updatedMessage.sender.id !== tokenPayload.sub) {
      throw new ForbiddenException('You can only update your own messages');
    }

    updatedMessage.message = updateMessageDto.message ?? updatedMessage.message;
    updatedMessage.read = updateMessageDto.read ?? updatedMessage.read;

    return this.messageRepository.save(updatedMessage);
  }

  async delete(id: number, tokenPayload: TokenPayloadDto) {
    const deletedMessage = await this.findOne(id);

    if (deletedMessage.sender.id !== tokenPayload.sub) {
      throw new ForbiddenException('You can only update your own messages');
    }

    if (!deletedMessage) {
      throw new NotFoundException('Message not found');
    }

    return this.messageRepository.delete(id);
  }
}
