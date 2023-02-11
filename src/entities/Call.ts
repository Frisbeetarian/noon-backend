import { Field, ObjectType } from 'type-graphql'
@ObjectType()
export class Call {
  @Field(() => String)
  profileUuid?: string

  @Field(() => String)
  profileUsername?: string

  @Field(() => Boolean, { defaultValue: false })
  pendingCall?: boolean

  @Field(() => Boolean, { defaultValue: false })
  ongoingCall?: boolean
}
