import { IsNotEmpty, IsPositive, IsString } from 'class-validator';

export class CreateMessageDto {
  @IsString()
  @IsNotEmpty()
  readonly message: string;

  @IsPositive()
  senderId: number;

  @IsPositive()
  receiverId: number;
}
