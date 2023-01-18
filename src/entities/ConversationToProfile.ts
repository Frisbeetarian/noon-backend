import {
  Entity,
  Column,
  ManyToOne,
  PrimaryGeneratedColumn,
  BaseEntity,
  UpdateDateColumn,
  CreateDateColumn,
} from 'typeorm'
import { Conversation } from './Conversation'
import { Profile } from './Profile'
import { Field, ObjectType } from 'type-graphql'

@ObjectType()
@Entity('conversation_profile')
export class ConversationToProfile extends BaseEntity {
  constructor(
    conversation: Conversation,
    profile: Profile[],
    profileUsername: string
  ) {
    super()
    this.conversation = conversation
    this.profile = profile
    this.profileUsername = profileUsername
  }

  @Field(() => String)
  @PrimaryGeneratedColumn()
  public uuid!: string

  @Field(() => String)
  @Column()
  public conversationUuid!: string

  @Field(() => String)
  @Column()
  public profileUuid!: string

  @Field(() => String)
  @Column()
  public profileUsername!: string

  @Field()
  @Column({ default: 0 })
  unreadMessages?: number

  @Field()
  @Column({ default: [], nullable: true })
  profileThatHasUnreadMessages!: string

  @Field(() => Boolean)
  @Column({ type: 'boolean', default: false })
  ongoingCall: boolean | any

  @Field(() => Boolean)
  @Column({ type: 'boolean', default: false })
  pendingCall: boolean | any

  // @Column()
  // public order!: number

  @Field(() => Conversation)
  @ManyToOne(
    () => Conversation,
    (conversation) => conversation.conversationToProfiles
  )
  public conversation!: Conversation

  @Field(() => [Profile])
  @ManyToOne(() => Profile, (profile) => profile.conversationToProfiles)
  public profile!: Profile[]

  // @Field(() => String)

  @Field(() => String)
  @UpdateDateColumn()
  updatedAt: Date

  @Field(() => String)
  @CreateDateColumn()
  createdAt: Date
}
