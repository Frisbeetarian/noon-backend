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
    console.log('PROFILdE: ', profile)
    return profile
  }

  @Query(() => [Profile])
  async getProfiles(@Ctx() { req }: MyContext) {
    const profiles = await getProfiles()
    let profilesArray = []

    // console.log('PROFILES:', profiles)

    profiles.map((profile) => {
      if (profile.get('user').get('id') !== req.session.userId) {
        let profileObject = new Profile()
        // console.log('Profile : ', profile.get('user').get('id'))

        profileObject.id = profile.get('id')
        profileObject.username = profile.get('username')
          ? profile.get('username')
          : 'emptyusername'

        profilesArray.push(profileObject)
      }
    })

    // console.log('Profiles in getprofiles: ', profilesArray)
    return profilesArray
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
    // console.log('friend request received')
    const senderProfile = await Profile.findOne({
      where: { userId: req.session.userId },
    })

    await sendFriendRequest(senderProfile?.id, profileUuid)
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

    return await acceptFriendRequest(senderProfile.id, recipientProfile.id)
  }
}
