// @ts-nocheck
import {
  Arg,
  Ctx,
  FieldResolver,
  Int,
  Query,
  Resolver,
  Root,
} from 'type-graphql'
import { getConnection } from 'typeorm'
import { ConversationToProfile } from '../entities/ConversationToProfile'
import { Profile } from '../entities/Profile'
import { Conversation } from '../entities/Conversation'
import { Message } from '../entities/Message'
import { MyContext } from '../types'

@Resolver(ConversationToProfile)
export class ConversationProfileResolver {
  // @FieldResolver(() => [Profile])
  // profiles(@Root() conversationToProfile: ConversationToProfile | null) {
  //   return conversationToProfile.profile
  // }
  //
  // @FieldResolver(() => [Conversation])
  // conversations(@Root() conversationToProfile: ConversationToProfile | null) {
  //   return conversationToProfile.conversation
  // }
  //
  // @FieldResolver(() => [Message])
  // messages(@Root() conversation: Conversation | null) {
  //   return conversation.messages
  // }

  @Query(() => ConversationToProfile, { nullable: true })
  async getConversationProfileForLoggedInUser(
    @Ctx() { req }: MyContext
  ): Promise<{ uuid: String; profiles: {}; messages: {} }> {
    const loggedInProfileUuid = req.session.user.profile.uuid
    const objectToSend = []

    try {
      const conversations = await ConversationToProfile.find({
        where: [{ profileUuid: loggedInProfileUuid }],
        relations: ['conversation', 'profile'],
      })

      if (conversations) {
        await Promise.all(
          conversations.map(async (conversation) => {
            const conversationObject = await ConversationToProfile.find({
              where: [{ conversationUuid: conversation.conversationUuid }],
              relations: ['conversation', 'profile'],
            })

            objectToSend.push({
              uuid: conversationObject[0].conversationUuid,
              profiles: [
                {
                  uuid: conversationObject[0].profile.uuid,
                  username: conversationObject[0].profile.username,
                },
                {
                  uuid: conversationObject[1].profile.uuid,
                  username: conversationObject[1].profile.username,
                },
              ],
              messages: [...conversationObject[0].conversation.messages],
            })
          })
        )
        console.log('object profile to send:', objectToSend)
      }
      return objectToSend
    } catch (e) {
      console.log('error:', e)
      return null
    }
    return objectToSend
  }

  // @Query(() => [CommunityParticipant])
  // async getCommunityParticipants(
  //   @Arg('id', () => Int) id: number
  // ): Promise<CommunityParticipant[] | undefined> {
  //   return await CommunityParticipant.find({ communityId: id })
  // }
  //
  // @Query(() => [CommunityParticipant])
  // async getCommunitiesParticipants(
  //   @Arg('communitiesIds', () => [Int]) communitiesIds: [number]
  // ): Promise<CommunityParticipant[] | undefined> {
  //   const data = await getConnection()
  //     .createQueryBuilder(CommunityParticipant, 'cp')
  //     .where('cp.communityId IN (:...communitiesIds)', {
  //       communitiesIds: communitiesIds,
  //     })
  //     .getMany()
  //   console.log('Participants: ', data)
  //
  //   return data
  // }
}
