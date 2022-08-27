import { Resolver, Query, Arg, FieldResolver, Root, Ctx } from 'type-graphql'
import { Conversation } from '../entities/Conversation'
import { getConnection } from 'typeorm'
import { Profile } from '../entities/Profile'
import { Friend } from '../entities/Friend'
import { MyContext } from '../types'
import { ConversationToProfile } from '../entities/ConversationToProfile'
import { Message } from '../entities/Message'

@Resolver(Conversation)
export class ConversationResolver {
  @FieldResolver(() => [Profile])
  profiles(@Root() conversation: Conversation | null) {
    return conversation.profiles
  }

  @FieldResolver(() => [ConversationToProfile])
  conversations(@Root() profile: Profile | null) {
    return profile.conversationToProfiles
  }

  @FieldResolver(() => [Message])
  messages(@Root() conversation: Conversation | null) {
    return conversation.messages
  }

  @Query(() => [Conversation], { nullable: true })
  async getConversationForLoggedInUser(
    @Ctx() { req }: MyContext
  ): Promise<Conversation | null> {
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
        console.log('object to send:', objectToSend)
        return objectToSend
      }
    } catch (e) {
      console.log('error:', e)
      return null
    }

    return objectToSend
  }

  @Query(() => Conversation, { nullable: true })
  async getConversationsByProfileUuid(
    @Arg('profileUuid', () => String) profileUuid: number | string,
    @Ctx() { req }: MyContext
  ): Promise<Conversation | null> {
    const loggedInProfileUuid = req.session.user.profile.uuid

    console.log('logged in profile uuid:', loggedInProfileUuid)
    console.log('logged in profile uuid:', profileUuid)

    try {
      // const conversations = await getConnection()
      //   .getRepository(Profile)
      //   .createQueryBuilder('profile')
      //   .where('profile.uuid = :loggedInProfileUuid', { loggedInProfileUuid })
      //   .leftJoinAndSelect('profile.conversations', 'conversation')
      //   .getMany()

      // const conversations = await getConnection()
      //   .getRepository(Conversation)
      //   .createQueryBuilder('conversation')
      //   .leftJoinAndSelect('conversation.profiles', 'profile')
      //   .where('profile.uuid = :profileUuid', { profileUuid })
      //   .getOne()

      const conversation = await ConversationToProfile.findOne({
        where: [
          { profileUuid: loggedInProfileUuid },
          { profileUuid: profileUuid },
        ],
        relations: ['conversation', 'profile'],
      })
      console.log('CONVERSATION:', conversation.conversation.messages)

      if (conversation) {
        // let messages = []
        // conversation.conversation.messages.forEach((message) => {
        //   messages.push({
        //     uuid: message.uuid,
        //     content: message.content,
        //     sender: {
        //       uuid: message.sender.uuid,
        //       username: message.sender.username,
        //     },
        //     updatedAt: message.updatedAt,
        //     createdAt: message.createdAt,
        //   })
        // })

        const objectToSend = {
          uuid: conversation.conversationUuid,
          profiles: [
            {
              uuid: conversation.profileUuid,
              username: conversation.profile.username,
            },
            {
              uuid: req.session.user.profile.uuid,
              username: req.session.user.profile.username,
            },
          ],
          messages: [...conversation.conversation.messages],
        }
        console.log('objectToSend:', objectToSend)
        return objectToSend
      }
    } catch (e) {
      console.log('error:', e)
      return null
    }

    return null
  }
}
