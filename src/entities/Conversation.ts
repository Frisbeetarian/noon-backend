import {
  BaseEntity,
  CreateDateColumn,
  Entity,
  JoinTable,
  ManyToMany,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm'
import { Field, ObjectType } from 'type-graphql'
import { Message } from './Message'
import { Profile } from './Profile'
import { ConversationToProfile } from './ConversationToProfile'

@ObjectType()
@Entity()
export class Conversation extends BaseEntity {
  constructor() {
    super()
  }

  @Field(() => String)
  @PrimaryGeneratedColumn('uuid')
  uuid?: string

  @OneToMany(() => Message, (message) => message.conversation, {
    cascade: true,
    eager: true,
  })
  messages: Message[]

  // @OneToMany(() => Profile, (profile) => profile.conversations)
  // profiles: Profile[]

  // @ManyToMany(() => Profile, (profile) => profile.conversations)
  // @JoinTable()
  // profiles: Profile[]

  @OneToMany(
    () => ConversationToProfile,
    (conversationToProfile) => conversationToProfile.conversation
  )
  public conversationToProfiles!: ConversationToProfile[]

  @Field(() => String)
  @UpdateDateColumn()
  updatedAt: Date

  @Field(() => String)
  @CreateDateColumn()
  createdAt: Date
}
