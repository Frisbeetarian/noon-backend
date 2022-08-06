import { Field, Int, ObjectType } from 'type-graphql'
import {
  BaseEntity,
  Column,
  CreateDateColumn,
  Entity,
  // JoinTable,
  // JoinTable,
  // ManyToMany,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm'
import { Post } from './Post'
import { Updoot } from './Updoot'
// import { Event } from './Event'
import { User } from './User'
import { CommunityParticipant } from './CommunityParticipant'

@ObjectType()
@Entity()
export class Profile extends BaseEntity {
  @Field(() => String)
  @PrimaryGeneratedColumn('uuid')
  id!: string

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
