import { Field, ObjectType } from 'type-graphql'
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
import { Post } from './Post'
import { Updoot } from './Updoot'
import { Profile } from './Profile'

@ObjectType()
@Entity()
export class User extends BaseEntity {
  @Field(() => String)
  @PrimaryGeneratedColumn('uuid')
  uuid!: string

  @Field()
  @Column({ unique: true })
  username!: string

  @Field()
  @Column({ unique: true, nullable: true })
  email!: string

  @Column()
  password!: string

  @OneToMany(() => Post, (post) => post.creator)
  posts: Post[]

  @OneToMany(() => Updoot, (updoot) => updoot.user)
  updoots: Updoot[]

  @Column({ nullable: true })
  profileId?: string

  @OneToOne(() => Profile, (profile) => profile.user, {
    cascade: true,
    nullable: true,
  })
  @JoinColumn()
  profile: Profile

  @Field(() => String)
  @UpdateDateColumn()
  updatedAt: Date

  @Field(() => String)
  @CreateDateColumn()
  createdAt: Date
}
