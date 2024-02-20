import {
  BaseEntity,
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm'
import { Message } from './Message'

@Entity()
export class EncryptedKey extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  uuid?: string

  @Column()
  encryptedKey: string

  // @Column()
  // iv: string

  @Column()
  recipientUuid: string

  @ManyToOne(() => Message, (message) => message.encryptedKeys)
  message: Message

  @UpdateDateColumn()
  updatedAt: Date

  @CreateDateColumn()
  createdAt: Date
}
