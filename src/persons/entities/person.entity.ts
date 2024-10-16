import { IsEmail } from 'class-validator';
import { Message } from 'src/messages/entities/message.entity';
import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity()
export class Person {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  @IsEmail()
  email: string;

  @Column({ length: 255 })
  passwordHash: string;

  @Column({ length: 100 })
  name: string;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @OneToMany(() => Message, (message) => message.sender)
  messages: Message[];

  @Column({ default: true })
  active: boolean;

  @Column({ default: '' })
  picture: string;
}
