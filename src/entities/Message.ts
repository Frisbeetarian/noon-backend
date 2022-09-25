import {
  BaseEntity,
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm'
import { Field, ObjectType } from 'type-graphql'
import { Profile } from './Profile'

import { Conversation } from './Conversation'

@ObjectType()
@Entity()
export class Message extends BaseEntity {
  constructor(
    conversation: Conversation,
    sender: Profile,
    content: string,
    type: string,
    src: string
  ) {
    super()
    this.conversation = conversation
    this.sender = sender
    this.content = content
    this.type = type
    this.src = src
  }

  @Field(() => String)
  @PrimaryGeneratedColumn('uuid')
  uuid?: string

  @Field(() => Profile)
  @ManyToOne(() => Profile, (profile) => profile.senderMessages, {
    eager: true,
  })
  sender: Profile

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

  @ManyToOne(() => Conversation, (Conversation) => Conversation.messages)
  conversation: Conversation

  @Field(() => String)
  @UpdateDateColumn()
  updatedAt: Date

  @Field(() => String)
  @CreateDateColumn()
  createdAt: Date
}
