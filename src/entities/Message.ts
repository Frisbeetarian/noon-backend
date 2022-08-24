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
  @Field(() => String)
  @PrimaryGeneratedColumn('uuid')
  uuid?: string

  @ManyToOne((type) => Profile, (profile) => profile.senderMessages, {
    eager: true,
  })
  sender: Profile

  @Column()
  content: string

  @ManyToOne((type) => Conversation, (Conversation) => Conversation.messages)
  conversation: Conversation

  @Field(() => String)
  @UpdateDateColumn()
  updatedAt: Date

  @Field(() => String)
  @CreateDateColumn()
  createdAt: Date
}
