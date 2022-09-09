import {
  Entity,
  Column,
  ManyToOne,
  PrimaryGeneratedColumn,
  BaseEntity,
  OneToMany,
  UpdateDateColumn,
  CreateDateColumn,
  OneToOne,
  JoinColumn,
} from 'typeorm'
import { Conversation } from './Conversation'
import { Profile } from './Profile'
import { Field, ObjectType } from 'type-graphql'

@ObjectType()
@Entity('conversation_profile')
export class ConversationToProfile extends BaseEntity {
  constructor(conversation: Conversation, profile: Profile[]) {
    super()
    this.conversation = conversation
    this.profile = profile
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

  @Field()
  @Column({ default: 0 })
  unreadMessages?: number

  @Field()
  @Column({ default: [], nullable: true })
  profileThatHasUnreadMessages!: string

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
  @Column({ type: 'varchar', default: false })
  ongoingCall: boolean | any

  @Column({ type: 'varchar', default: false })
  pendingCall: boolean | any

  @Column({ nullable: true })
  pendingCallProfileId?: string

  @OneToOne(() => Profile, (profile) => profile.pendingCall, {
    cascade: true,
    nullable: true,
  })
  @JoinColumn()
  pendingCallProfile: Profile

  @Field(() => String)
  @UpdateDateColumn()
  updatedAt: Date

  @Field(() => String)
  @CreateDateColumn()
  createdAt: Date
}
