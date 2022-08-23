import {
  BaseEntity,
  CreateDateColumn,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm'
import { Field, ObjectType } from 'type-graphql'
import { Message } from './Message'
import { CommunityParticipant } from './CommunityParticipant'
import { Profile } from './Profile'

@ObjectType()
export class Conversation extends BaseEntity {
  @Field(() => String)
  @PrimaryGeneratedColumn('uuid')
  uuid?: string

  @OneToMany(() => Message, (message) => message.conversation, {
    cascade: true,
    eager: true,
  })
  messages: Message[]

  @OneToMany(() => Profile, (profile) => profile.conversations)
  profiles: Profile[]

  @Field(() => String)
  @UpdateDateColumn()
  updatedAt: Date

  @Field(() => String)
  @CreateDateColumn()
  createdAt: Date
}
