// @ts-nocheck
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
import { User } from './User'
import { ConversationToProfile } from './ConversationToProfile'
import { Message } from './Message'

@Entity()
export class Profile extends BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  uuid!: string

  @Column({ unique: true, nullable: true })
  username: string

  @Column({ nullable: true })
  name?: string

  @Column({ nullable: true })
  userId?: string

  @OneToOne(() => User, (user) => user.profile)
  user: User

  @ManyToMany(() => Profile)
  @JoinTable()
  friends: Profile[]

  @ManyToMany(() => Profile)
  @JoinTable()
  friendshipRequests: Profile[]

  @ManyToOne(
    () => ConversationToProfile,
    (conversationToProfile) => conversationToProfile.profile
  )
  public conversationToProfiles!: ConversationToProfile

  @OneToMany(() => Message, (message) => message.sender, {
    cascade: true,
  })
  senderMessages: Message[]

  @UpdateDateColumn()
  updatedAt: Date

  @CreateDateColumn()
  createdAt: Date
}
