// @ts-nocheck
import { BaseEntity, PrimaryGeneratedColumn } from 'typeorm'
import { Field, ObjectType } from 'type-graphql'

@ObjectType()
export class FriendshipRequest extends BaseEntity {
  @Field(() => String)
  @PrimaryGeneratedColumn('uuid')
  uuid?: string

  @Field()
  username?: string

  @Field({ defaultValue: false })
  reverse?: Boolean
}
