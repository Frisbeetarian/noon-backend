import {
  BaseEntity,
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  JoinTable,
  ManyToMany,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm'
import { Field, ObjectType } from 'type-graphql'
import { Message } from './Message'
import { Profile } from './Profile'
import { ConversationToProfile } from './ConversationToProfile'
import { Community } from './Community'

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

  @Field()
  @Column({ default: 0 })
  unreadMessages?: number

  @Field()
  @Column({ default: '', nullable: true })
  profileThatHasUnreadMessages?: string
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

  @Column({ type: 'varchar', default: false })
  ongoingCall: boolean | any

  @Column({ type: 'varchar', default: false })
  pendingCall: boolean | any

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
