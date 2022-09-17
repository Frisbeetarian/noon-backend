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
  checkFriendship,
  refuseFriendRequest,
  cancelFriendRequest,
} from '../neo4j/neo4j_calls/neo4j_api'

import { User } from '../entities/User'
import { MyContext } from '../types'
import { Friend } from '../entities/Friend'
import { FriendshipRequest } from '../entities/FriendshipRequest'
import { Conversation } from '../entities/Conversation'
import { getConnection } from 'typeorm'
import { ConversationToProfile } from '../entities/ConversationToProfile'
import rpcClient from '../utils/brokerInitializer'

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

  @FieldResolver(() => [Friend])
  friends(@Root() profile: Profile[] | null) {
    return profile.friends
  }

  @FieldResolver(() => [FriendshipRequest])
  friendshipRequests(@Root() profile: Profile[] | null) {
    return profile.friendshipRequests
  }

  @Query(() => Profile, { nullable: true })
  async profile(
    @Arg('uuid', () => String) uuid: number
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
    return profile
  }

  @Query(() => [Profile])
  async getProfiles(@Ctx() { req }: MyContext) {
    // console.log('FERWFERFERFre:', req.session.user)

    let profiles = await getProfiles(req.session.user?.profile.uuid)
    // profiles = profiles.filter(
    //   (profile) => profile.user.uuid != req.session.userId
    // )

    // console.log('Profiles in getprofiles33: ', profiles)
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

    const recipientProfile = await Profile.findOne(profileUuid)

    await sendFriendRequest(
      senderProfile?.uuid,
      senderProfile?.username,
      recipientProfile?.uuid,
      recipientProfile?.username
    )

    // await rpcClient.search().updateEntryInIndex({
    //   index: 'PROFILES',
    //   senderUuid: senderProfile?.uuid,
    //   recipientProfile: {
    //     uuid: recipientProfile?.uuid,
    //     username: recipientProfile?.username,
    //   },
    // })

    return true
  }

  @Mutation(() => Boolean)
  async acceptFriendRequest(
    @Ctx() { req }: MyContext,
    @Arg('profileUuid', () => String) profileUuid: number | string
  ) {
    //TODO reorganize sender/recipient logic, seems to be in reverse (no since recipient and actor on request is the one logged in)
    const recipientProfile = await Profile.findOne({
      where: { userId: req.session.userId },
    })

    const senderProfile = await Profile.findOne(profileUuid)

    const areFriends = await checkFriendship(
      senderProfile?.uuid,
      recipientProfile?.uuid
    )

    console.log('are friends check: ', areFriends)

    if (!areFriends) {
      await acceptFriendRequest(
        senderProfile?.uuid,
        senderProfile?.username,
        recipientProfile?.uuid,
        recipientProfile?.username
      )

      // const profile1 = await Profile.findOne(senderProfile?.uuid)
      // const profile2 = await Profile.findOne(recipientProfile?.uuid)
      // let conversation = await Conversation.create().save()

      const conversationRepository = getConnection().getRepository(Conversation)
      const conversationProfileRepository = getConnection().getRepository(
        ConversationToProfile
      )

      let conversation = new Conversation()
      await conversationRepository.save(conversation)

      const conversationToProfile = new ConversationToProfile(
        conversation,
        recipientProfile
      )
      await conversationProfileRepository.save(conversationToProfile)

      const conversationToProfile2 = new ConversationToProfile(
        conversation,
        senderProfile
      )

      await conversationProfileRepository.save(conversationToProfile2)
      // await conversationRepository.save(conversation)

      // await getConnection().manager.save(conversation)

      // conversation.profiles = [profile2]
      // await getConnection().manager.save(conversation)
      console.log('conversation:', conversation.profiles)

      return conversation
    }
  }

  @Mutation(() => Boolean)
  async cancelFriendRequest(
    @Ctx() { req }: MyContext,
    @Arg('profileUuid', () => String) profileUuid: number | string
  ) {
    const recipientProfile = await Profile.findOne({
      where: { userId: req.session.userId },
    })

    const senderProfile = await Profile.findOne(profileUuid)

    try {
      await cancelFriendRequest(
        senderProfile?.uuid,
        senderProfile?.username,
        recipientProfile?.uuid,
        recipientProfile?.username
      )
      return true
    } catch (e) {
      console.log(e)
      return false
    }
  }

  @Mutation(() => Boolean)
  async refuseFriendRequest(
    @Ctx() { req }: MyContext,
    @Arg('profileUuid', () => String) profileUuid: number | string
  ) {
    const recipientProfile = await Profile.findOne({
      where: { userId: req.session.userId },
    })

    const senderProfile = await Profile.findOne(profileUuid)

    try {
      await refuseFriendRequest(
        senderProfile?.uuid,
        senderProfile?.username,
        recipientProfile?.uuid,
        recipientProfile?.username
      )
      return true
    } catch (e) {
      console.log(e)
      return false
    }
  }
}
