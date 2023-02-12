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
import { Call } from './Call'
import { Sender } from './ShortProfile'
// interface ProfileInConversation {
//   uuid: string
//   username: string
// }
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
  messages: Message[] | [] | undefined | null

  @Field()
  @Column({ default: 0 })
  unreadMessages?: number

  @Field(() => String)
  @Column({ default: 'pm' })
  type: string

  @Field({ nullable: true })
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

  @Field(() => Boolean)
  @Column({ default: false })
  pendingCall?: boolean

  @Field(() => Boolean)
  @Column({ default: false })
  ongoingCall?: boolean

  // @Field(() => [ConversationToProfile])
  @OneToMany(
    () => ConversationToProfile,
    (conversationToProfile) => conversationToProfile.conversation
  )
  public conversationToProfiles!: ConversationToProfile[]

  @Field(() => [Call])
  public calls?: Call[]

  // @Field([ProfileInConversation])
  @Field(() => [Sender])
  public profiles!: { uuid: string; username: string }[]

  @Field(() => Sender, { nullable: true })
  @OneToOne(() => Profile, {
    nullable: true,
  })
  @JoinColumn()
  pendingCallProfile?: Sender

  @Field(() => String)
  @UpdateDateColumn()
  updatedAt: Date

  @Field(() => String)
  @CreateDateColumn()
  createdAt: Date
}
