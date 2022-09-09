import { Field, Int, ObjectType } from 'type-graphql'
import {
  BaseEntity,
  Column,
  CreateDateColumn,
  Entity,
  JoinTable,
  ManyToMany,
  ManyToOne,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm'
import { Post } from './Post'
import { Updoot } from './Updoot'
import { User } from './User'
import { CommunityParticipant } from './CommunityParticipant'
import { Conversation } from './Conversation'
import { ConversationToProfile } from './ConversationToProfile'
import { Message } from './Message'

@ObjectType()
@Entity()
export class Profile extends BaseEntity {
  @Field(() => String)
  @PrimaryGeneratedColumn('uuid')
  uuid!: string

  @Field()
  @Column({ unique: true, nullable: true })
  username: string

  @Column({ nullable: true })
  name?: string

  @Column({ nullable: true })
  userId?: string

  @OneToOne(() => User, (user) => user.profile)
  user: User

  @OneToOne(
    () => ConversationToProfile,
    (conversationToProfile) => conversationToProfile.pendingCallProfile
  )
  pendingCall: ConversationToProfile

  @OneToMany(() => Post, (post) => post.creator)
  posts: Post[]

  @OneToMany(() => Updoot, (updoot) => updoot.user)
  updoots: Updoot[]

  // @ManyToMany(() => Conversation, (conversation) => conversation.profiles)
  // @JoinTable()
  // conversations: Conversation[]
  @ManyToOne(
    () => ConversationToProfile,
    (conversationToProfile) => conversationToProfile.profile
  )
  public conversationToProfiles!: ConversationToProfile

  @OneToMany(() => Message, (message) => message.sender, {
    cascade: true,
  })
  senderMessages: Message[]
  // @ManyToMany(() => Friend)
  // friends?: Friend[]
  @OneToMany(
    () => CommunityParticipant,
    (communityParticipant) => communityParticipant.profile
  )
  communities: CommunityParticipant[]

  @Field(() => String)
  @UpdateDateColumn()
  updatedAt: Date

  @Field(() => String)
  @CreateDateColumn()
  createdAt: Date
}
