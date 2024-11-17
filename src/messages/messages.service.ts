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
import { EmailService } from 'src/email/email.service';
import { ResponseMessageDto } from './dto/response-message.dts';

@Injectable()
export class MessagesService {
  constructor(
    @InjectRepository(Message)
    private readonly messageRepository: Repository<Message>,
    private readonly personsService: PersonsService,
    private readonly emailService: EmailService,
  ) {}

  async findAll(paginationDto?: PaginationDto): Promise<ResponseMessageDto[]> {
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

  async findOne(id: number): Promise<ResponseMessageDto> {
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
  ): Promise<ResponseMessageDto> {
    const { receiverId } = createMessageDto;

    const sender = await this.personsService.findOne(tokenPayload.sub);

    const receiver = await this.personsService.findOne(receiverId);

    await this.emailService.sendEmail(
      receiver.email,
      `New message from ${sender.name}`,
      createMessageDto.message,
    );

    const newMessage = {
      message: createMessageDto.message,
      receiver: receiver,
      sender: sender,
    };

    this.messageRepository.create(createMessageDto);
    await this.messageRepository.save(newMessage);

    return {
      ...newMessage,
      read: false,
      sender: {
        id: newMessage.sender.id,
        name: newMessage.sender.name,
      },
      receiver: {
        id: newMessage.receiver.id,
        name: newMessage.sender.name,
      },
    };
  }

  async update(
    id: number,
    updateMessageDto: UpdateMessageDto,
    tokenPayload: TokenPayloadDto,
  ): Promise<ResponseMessageDto> {
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
