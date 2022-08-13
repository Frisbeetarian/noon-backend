import {
  BaseEntity,
  Column,
  Entity,
  ManyToOne,
  PrimaryColumn,
  PrimaryGeneratedColumn,
} from 'typeorm'
import { Community } from './Community'
import { Profile } from './Profile'
import { Field, Int, ObjectType } from 'type-graphql'

@ObjectType()
export class Friend extends BaseEntity {
  @Field(() => String)
  uuid?: string

  @Field()
  username?: string
}
