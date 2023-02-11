import { Field, ObjectType } from 'type-graphql'

@ObjectType()
export class Sender {
  @Field()
  uuid: string

  @Field()
  username: string
}
