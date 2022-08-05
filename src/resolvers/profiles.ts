import { Resolver, Query, Arg, Int, InputType } from 'type-graphql'
import { Event } from '../entities/Event'
import { Profile } from '../entities/Profile'

@InputType()
// class ProfileInput {
//   @Field()
//   username: string
// }

// @ObjectType()
// class PaginatedEvents {
//   @Field(() => [Event])
//   events: Event[]
//   @Field()
//   hasMore: boolean
// }

@Resolver(Profile)
export class ProfileResolver {
  @Query(() => Profile, { nullable: true })
  async profile(
    @Arg('id', () => Int) id: number
  ): Promise<Profile | undefined> {
    let profile = await Profile.findOne(id, { relations: ['events'] })
    console.log('PROFILE: ', profile)
    return profile
  }

  @Query(() => Profile)
  async getProfileByUserId(
    @Arg('userId', () => Int) userId: number
  ): Promise<Profile | undefined> {
    let profile = await Profile.findOne({ where: { userId: userId } })
    console.log('PROFILE: ', profile)
    return profile
  }

  @Query(() => [Profile])
  async getProfiles() {
    let profiles = await Profile.find()
    return profiles
  }
}
