// @ts-nocheck
import { Field, ObjectType } from 'type-graphql'
import {
  BaseEntity,
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm'
import { Post } from './Post'
import { Updoot } from './Updoot'
import { User } from './User'
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

  @OneToMany(() => Post, (post) => post.creator)
  posts: Post[]

  @OneToMany(() => Updoot, (updoot) => updoot.user)
  updoots: Updoot[]

  @ManyToOne(
    () => ConversationToProfile,
    (conversationToProfile) => conversationToProfile.profile
  )
  public conversationToProfiles!: ConversationToProfile

  @OneToMany(() => Message, (message) => message.sender, {
    cascade: true,
  })
  senderMessages: Message[]

  @Field(() => String)
  @UpdateDateColumn()
  updatedAt: Date

  @Field(() => String)
  @CreateDateColumn()
  createdAt: Date
}
