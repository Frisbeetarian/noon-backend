import {
  BaseEntity,
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm'

import { Profile } from './Profile'
import { Conversation } from './Conversation'
import { EncryptedKey } from './EncryptedKey'

@Entity()
export class Message extends BaseEntity {
  constructor(
    conversation: Conversation,
    // conversationUuid: string,
    sender: Profile,
    content: string,
    type: string,
    src: string
  ) {
    super()
    this.conversation = conversation
    // this.conversationUuid = conversationUuid
    this.sender = sender
    this.content = content
    this.type = type
    this.src = src
  }

  @PrimaryGeneratedColumn('uuid')
  uuid?: string

  @ManyToOne(() => Profile, (profile) => profile.senderMessages, {
    eager: true,
  })
  sender: Profile

  @Column()
  content: string

  @Column({ default: 'text' })
  type: string

  @Column({ nullable: true })
  src?: string

  @Column({ default: false })
  deleted: boolean

  @Column()
  conversationUuid: string

  @ManyToOne(() => Conversation, (Conversation) => Conversation.messages)
  conversation: Conversation

  @OneToMany(() => EncryptedKey, (encryptedKey) => encryptedKey.message, {
    cascade: true,
  })
  encryptedKeys: EncryptedKey[]

  @UpdateDateColumn()
  updatedAt: Date

  @CreateDateColumn()
  createdAt: Date
}
