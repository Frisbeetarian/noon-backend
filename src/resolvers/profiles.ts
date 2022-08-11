import {
  Resolver,
  Query,
  Arg,
  Int,
  InputType,
  FieldResolver,
  Root,
  Ctx,
  Mutation,
} from 'type-graphql'
import { Event } from '../entities/Event'
import { Profile } from '../entities/Profile'
import {
  acceptFriendRequest,
  getProfileByUsername,
  getProfiles,
  sendFriendRequest,
} from '../neo4j/neo4j_calls/neo4j_api'
import { User } from '../entities/User'
import { MyContext } from '../types'

// @InputType()
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
  @FieldResolver(() => User)
  user(@Root() profile: Profile) {
    return profile.user
  }

  @Query(() => Profile, { nullable: true })
  async profile(
    @Arg('uuid', () => Int) uuid: number
  ): Promise<Profile | undefined> {
    let profile = await Profile.findOne(uuid, { relations: ['events'] })
    console.log('PROFILE: ', profile)
    return profile
  }

  @Query(() => Profile)
  async getProfileByUserId(
    @Arg('userId', () => Int) userId: number
  ): Promise<Profile | undefined> {
    let profile = await Profile.findOne({ where: { userId: userId } })
    console.log('PROFILdE: ', profile)
    return profile
  }

  @Query(() => [Profile])
  async getProfiles(@Ctx() { req }: MyContext) {
    let profiles = await getProfiles()
    profiles = profiles.filter(
      (profile) => profile.user.uuid != req.session.userId
    )

    console.log('Profiles in getprofiles: ', profiles)
    return profiles
  }

  @Query(() => Profile)
  async getProfileByUsername(
    @Arg('username', () => Int) username: number | string
  ) {
    return await getProfileByUsername(username)
  }

  @Mutation(() => Boolean)
  async sendFriendRequest(
    @Ctx() { req }: MyContext,
    @Arg('profileUuid', () => String) profileUuid: number | string
  ) {
    const senderProfile = await Profile.findOne({
      where: { userId: req.session.userId },
    })

    await sendFriendRequest(senderProfile?.uuid, profileUuid)
  }

  @Mutation(() => Boolean)
  async acceptFriendRequest(
    @Ctx() { req }: MyContext,
    @Arg('profileUuid', () => String) profileUuid: number | string
  ) {
    console.log('ACCEPT FRIEND REQUEST RECEIVED')

    const recipientProfile = await Profile.findOne({
      where: { userId: req.session.userId },
    })

    const senderProfile = await Profile.findOne(profileUuid)

    return await acceptFriendRequest(senderProfile.uuid, recipientProfile.uuid)
  }
}
