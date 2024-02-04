// @ts-nocheck
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

  @PrimaryGeneratedColumn()
  public uuid!: string

  @Column()
  public conversationUuid!: string

  @Column()
  public profileUuid!: string

  @Column()
  public profileUsername!: string

  @Column({ default: 0 })
  unreadMessages?: number

  @Column({ default: [], nullable: true })
  profileThatHasUnreadMessages!: string

  @Column({ type: 'boolean', default: false })
  ongoingCall: boolean | any

  @Column({ type: 'boolean', default: false })
  pendingCall: boolean | any

  @ManyToOne(
    () => Conversation,
    (conversation) => conversation.conversationToProfiles
  )
  public conversation!: Conversation

  @ManyToOne(() => Profile, (profile) => profile.conversationToProfiles)
  public profile!: Profile[]

  @UpdateDateColumn()
  updatedAt: Date

  @CreateDateColumn()
  createdAt: Date
}
