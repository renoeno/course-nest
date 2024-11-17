import { ApiProperty, PartialType } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';
import { CreateMessageDto } from './create-message.dto';

export class UpdateMessageDto extends PartialType(CreateMessageDto) {
  @ApiProperty({
    example: true,
    description: 'Message read status',
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  readonly read?: boolean;
}
