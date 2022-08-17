import { Field, Int, ObjectType } from 'type-graphql'
import {
  BaseEntity,
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm'
import { User } from './User'
import { CommunityParticipant } from './CommunityParticipant'

@ObjectType()
@Entity()
export class Community extends BaseEntity {
  @Field(() => Int)
  @PrimaryGeneratedColumn()
  id!: number

  @Field()
  @Column({ unique: true })
  username!: string

  @Field()
  @Column()
  title!: string

  @Field()
  @Column()
  description!: string

  @Field()
  @Column()
  privacy!: string

  @Field({ nullable: true, defaultValue: new Date() })
  @Column()
  startDate?: Date

  @Field({ nullable: true, defaultValue: new Date() })
  @Column()
  endDate?: Date

  @Field()
  @Column()
  timezone: string

  @Field()
  @Column()
  creatorId: string

  @Field(() => User)
  @ManyToOne(() => User, (user) => user.communities)
  creator: User

  // @Field(() => [Profile])
  // @ManyToMany(() => Profile)
  // @JoinTable()
  // participants?: Profile[]
  //

  @OneToMany(
    () => CommunityParticipant,
    (communityParticipant) => communityParticipant.community
  )
  participants: CommunityParticipant[]

  @Field(() => String)
  @UpdateDateColumn()
  updatedAt: Date

  @Field(() => String)
  @CreateDateColumn()
  createdAt: Date
}
