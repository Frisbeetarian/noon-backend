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
import { Message } from './Message'
import { Profile } from './Profile'
import { ConversationToProfile } from './ConversationToProfile'

@Entity()
export class Conversation extends BaseEntity {
  constructor() {
    super()
  }

  @PrimaryGeneratedColumn('uuid')
  uuid?: string

  @OneToMany(() => Message, (message) => message.conversation, {
    cascade: true,
    // eager: true,
  })
  messages: Message[]

  @Column({ default: 0 })
  unreadMessages?: number

  @Column({ default: 'pm' })
  type: string

  @Column({ default: '', nullable: true })
  profileThatHasUnreadMessages?: string

  @Column({ default: null, nullable: true })
  name?: string

  @Column({ default: null, nullable: true })
  description?: string

  @Column({ default: false })
  hasMore?: boolean

  @OneToMany(
    () => ConversationToProfile,
    (conversationToProfile) => conversationToProfile.conversation
  )
  public conversationToProfiles!: ConversationToProfile[]

  @OneToOne(() => Profile, {
    nullable: true,
  })
  @JoinColumn()
  pendingCallProfile: Profile

  @UpdateDateColumn()
  updatedAt: Date

  @CreateDateColumn()
  createdAt: Date
}
