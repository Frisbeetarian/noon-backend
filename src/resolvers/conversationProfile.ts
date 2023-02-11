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
import { ConversationToProfile } from '../entities/ConversationToProfile'
import { MyContext } from '../types'

@Resolver(ConversationToProfile)
export class ConversationProfileResolver {
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
      }
      return objectToSend
    } catch (e) {
      console.log('error:', e)
      return null
    }
    return objectToSend
  }
}
