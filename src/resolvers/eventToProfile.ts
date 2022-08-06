import { Arg, Int, Query, Resolver } from 'type-graphql'
import { EventToProfile } from '../entities/EventToProfile'
// import { MyContext } from '../types'
// import { getConnection, Repository } from 'typeorm'

// import { Post } from '../entities/Post'
// import { getConnection } from 'typeorm'

// @ObjectType()
// class FilteredProfiles {
//   @Field(() => [EventToProfile])
//   eventToProfiles: EventToProfile[]
// }

@Resolver(EventToProfile)
export class EventToProfileResolver {
  // @Query(() => Post, { nullable: true })
  // post(@Arg('id', () => Int) id: number): Promise<Post | undefined> {
  //   // return em.findOne(Post, { id })
  //   return Post.findOne(id)
  // }
  // @Query(() => [EventToProfile])
  // async getProfiles(
  //   @Arg('id', () => Int) id: number
  //   // @ts-ignore
  // ): Promise<EventToProfile[] | undefined> {
  //   const data = await EventToProfile.find({ eventId: id })
  //
  //   return data
  // }
}
