import {
  BaseEntity,
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm'
import { GraphQLJSONObject } from 'graphql-type-json'

import { Field, ObjectType } from 'type-graphql'
import { Profile } from './Profile'
import { Conversation } from './Conversation'
import { Sender } from './ShortProfile'

@ObjectType()
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

  @Field(() => String)
  @PrimaryGeneratedColumn('uuid')
  uuid?: string

  @Field(() => Sender)
  @ManyToOne(() => Profile, (profile) => profile.senderMessages, {
    eager: true,
  })
  sender: { uuid: string; username: string }

  @Field(() => String)
  @Column()
  content: string

  @Field(() => String)
  @Column({ default: 'text' })
  type: string

  // @Field(() => Profile, { nullable: true })
  @Field(() => String, { nullable: true })
  @Column({ nullable: true })
  src?: string

  @Field(() => Boolean)
  @Column({ default: false })
  deleted: boolean

  @Field(() => String)
  @Column()
  conversationUuid: string

  @ManyToOne(() => Conversation, (Conversation) => Conversation.messages)
  conversation: Conversation

  @Field(() => String)
  @Column({ nullable: true })
  from: string

  @Field(() => String)
  @UpdateDateColumn()
  updatedAt: Date

  @Field(() => String)
  @CreateDateColumn()
  createdAt: Date
}
