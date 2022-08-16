import { BaseEntity, PrimaryGeneratedColumn } from 'typeorm'
import { Field, ObjectType } from 'type-graphql'

@ObjectType()
export class FriendshipRequest extends BaseEntity {
  @Field(() => String)
  @PrimaryGeneratedColumn('uuid')
  uuid?: string

  @Field()
  username?: string

  // @ManyToMany(() => Profile)
  // profiles?: Profile[]
}
