import {
  BaseEntity,
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  OneToMany,
  OneToOne,
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
    // eager: true,
  })
  messages: Message[]

  @Field()
  @Column({ default: 0 })
  unreadMessages?: number

  @Field(() => String)
  @Column({ default: 'pm' })
  type: string

  @Field()
  @Column({ default: '', nullable: true })
  profileThatHasUnreadMessages?: string

  @Field(() => String, { nullable: true })
  @Column({ default: null, nullable: true })
  name?: string

  @Field(() => String, { nullable: true })
  @Column({ default: null, nullable: true })
  description?: string

  @Field(() => Boolean)
  @Column({ default: false })
  hasMore?: boolean
  // @OneToMany(() => Profile, (profile) => profile.conversations)
  // profiles: Profile[]

  // @ManyToMany(() => Profile, (profile) => profile.conversations)
  // @JoinTable()
  // profiles: Profile[]

  @Field(() => [ConversationToProfile])
  @OneToMany(
    () => ConversationToProfile,
    (conversationToProfile) => conversationToProfile.conversation
  )
  public conversationToProfiles!: ConversationToProfile[]

  // @Field(() => Boolean)
  // @Column({ type: 'boolean', default: false })
  // ongoingCall: boolean | any

  // @Field(() => Boolean)
  // @Column({ type: 'boolean', default: false })
  // pendingCall: boolean | any

  @Field(() => Profile, { nullable: true })
  @OneToOne(() => Profile, {
    nullable: true,
  })
  @JoinColumn()
  pendingCallProfile: Profile

  // @Field(() => String)
  // @Column({ nullable: true })
  // profiles: Profile[]

  // @OneToMany(() => Profile, (profile) => profile.conversation)
  // profiles: Profile[]

  @Field(() => String)
  @UpdateDateColumn()
  updatedAt: Date

  @Field(() => String)
  @CreateDateColumn()
  createdAt: Date
}
