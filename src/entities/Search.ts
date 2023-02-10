import {
  BaseEntity,
  CreateDateColumn,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm'
import { Field, ObjectType } from 'type-graphql'

@ObjectType()
export class Search extends BaseEntity {
  @Field(() => String)
  @PrimaryGeneratedColumn('uuid')
  uuid?: string

  @Field()
  username?: string

  @Field()
  name?: string

  @Field()
  userId?: string

  @Field()
  isAFriend: false

  @Field()
  hasFriendshipRequestFromLoggedInProfile: false

  @Field()
  hasSentFriendshipRequestToProfile: false

  @Field(() => String)
  @UpdateDateColumn()
  updatedAt: Date

  @Field(() => String)
  @CreateDateColumn()
  createdAt: Date
}
