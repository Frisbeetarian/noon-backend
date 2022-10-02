import {
  Resolver,
  Query,
  Arg,
  FieldResolver,
  Root,
  Ctx,
  Field,
  Mutation,
} from 'type-graphql'
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

  // @FieldResolver(() => [Message])
  // messages(
  //   @Root() conversation: Conversation,
  //   @Ctx() { messageLoader }: MyContext
  // ) {
  //   // if (conversation.uuid) {
  //   return messageLoader.load(conversation)
  //   // }
  // }

  @FieldResolver(() => [Message])
  messages(@Root() conversation: Conversation | null) {
    return conversation.messages
  }

  @FieldResolver(() => Profile)
  pendingCallProfile(@Root() conversation: Conversation | null) {
    return conversation.pendingCallProfile
  }

  // @FieldResolver(() => Conversation)
  // unreadMessages(@Root() conversation: Conversation | null) {
  //   return conversation?.unreadMessages
  // }

  // @FieldResolver(() => ConversationToProfile)
  // profileThatHasUnreadMessages(@Root() conversation: Conversation | null) {
  //   return conversation?.profileThatHasUnreadMessages
  // }

  @Query(() => [Conversation], { nullable: true })
  async getConversationForLoggedInUser(
    @Ctx() { req }: MyContext
  ): Promise<Conversation | null> {
    const loggedInProfileUuid = req.session.user.profile.uuid
    const objectToSend = []
    let cursor = null

    try {
      const conversations = await ConversationToProfile.find({
        where: [{ profileUuid: loggedInProfileUuid }],
        relations: ['conversation', 'profile'],
      })

      if (conversations) {
        await Promise.all(
          conversations.map(async (conversation) => {
            const replacements: any[] = [5]

            const conversationObject = await ConversationToProfile.find({
              where: [{ conversationUuid: conversation.conversationUuid }],
              relations: ['conversation', 'profile'],
            })

            const conversationEntity = await Conversation.findOne({
              where: [{ uuid: conversation.conversationUuid }],
              relations: ['pendingCallProfile', 'messages'],
            })

            replacements.push(conversationEntity.uuid)
            console.log('conversation entity:', conversationEntity)
            // console.log('conversationObject:', conversationObject)
            // console.log('replacements:', replacements)

            const messages = await getConnection().query(
              `
            select profile.uuid, profile.username, message.*
            from profile
            LEFT JOIN message ON message."senderUuid" = profile.uuid
            ${`where message."conversationUuid" = $2`}
            order by message."createdAt" DESC
            limit $1
            `,
              replacements
            )

            let messagesToSend = []
            messages.forEach((message) => {
              messagesToSend.push({
                uuid: message.uuid,
                content: message.content,
                type: message.type,
                src: message.src,
                updatedAt: message.updatedAt,
                createdAt: message.createdAt,
                sender: {
                  uuid: message.senderUuid,
                  username: message.username,
                },
              })
            })

            // SELECT `settings`.*, `character_settings`.`value`
            // FROM (`settings`)
            // LEFT OUTER JOIN `character_settings`
            // ON `character_settings`.`setting_id` = `settings`.`id`
            // WHERE `character_settings`.`character_id` = '1' OR
            // `character_settings`.character_id is NULL

            // const messages = await getConnection()
            //   .getRepository(Message)
            //   .createQueryBuilder('m')
            //   .leftJoinAndSelect(
            //     'm.conversation',
            //     'c',
            //     'm."conversationUuid" = c.uuid'
            //   )
            //   .orderBy('m."createdAt"', 'DESC')
            //   .take(5)

            // console.log('MESSAGE FROM QUERY BUILDer:', messages)

            objectToSend.push({
              uuid: conversationObject[0].conversationUuid,
              unreadMessages: conversationObject[0].unreadMessages,
              profileThatHasUnreadMessages:
                conversationObject[0].profileThatHasUnreadMessages,
              ongoingCall: conversationEntity.ongoingCall,
              pendingCall: conversationEntity.pendingCall,
              pendingCallProfile: conversationEntity.pendingCallProfile,
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
              messages: messagesToSend,
              updatedAt: conversationObject[0].updatedAt,
              createdAt: conversationObject[0].createdAt,
            })
          })
        )

        // console.log(
        //   'object to send fewbfowejbfkwejbfiewubfieuwbfiewubfewiub:',
        //   objectToSend
        // )
        return objectToSend
      }
    } catch (e) {
      console.log('error:', e)
      return null
    }

    return objectToSend
  }

  @Mutation(() => Boolean)
  async setPendingCallForConversation(
    @Arg('conversationUuid', () => String) conversationUuid: number | string,
    @Arg('pendingCallInitiatorUuid', () => String)
    pendingCallInitiatorUuid: string,
    @Ctx() { req }: MyContext
  ) {
    try {
      console.log('pending call conversation uuid:', conversationUuid)
      console.log('pending call initiating:', pendingCallInitiatorUuid)

      await getConnection()
        .createQueryBuilder()
        .update(Conversation)
        .set({
          pendingCall: true,
          pendingCallProfile: req.session.user.profile.uuid,
        })
        .where('uuid = :conversationUuid', {
          conversationUuid,
        })
        .returning('*')
        .execute()
      return true
    } catch (e) {
      return false
    }
  }

  @Mutation(() => Boolean)
  async cancelPendingCallForConversation(
    @Arg('conversationUuid', () => String) conversationUuid: number | string,
    @Ctx() { req }: MyContext
  ) {
    try {
      // console.log('cancel pending call conversation uuid:', conversationUuid)

      await getConnection()
        .createQueryBuilder()
        .update(Conversation)
        .set({
          pendingCall: false,
          pendingCallProfile: null,
        })
        .where('uuid = :conversationUuid', {
          conversationUuid,
        })
        .returning('*')
        .execute()
      return true
    } catch (e) {
      return false
    }
  }

  @Mutation(() => Boolean)
  async clearUnreadMessagesForConversation(
    @Arg('profileUuid', () => String) profileUuid: number | string,
    @Arg('conversationUuid', () => String) conversationUuid: number | string,
    @Ctx() { req }: MyContext
  ) {
    try {
      await getConnection()
        .createQueryBuilder()
        .update(ConversationToProfile)
        .set({
          unreadMessages: 0,
          profileThatHasUnreadMessages: [],
        })
        .where('conversationUuid = :conversationUuid', {
          conversationUuid,
        })
        .returning('*')
        .execute()
      return true
    } catch (e) {
      return false
    }
  }

  @Mutation(() => Boolean)
  async updateUnreadMessagesForConversation(
    @Arg('profileUuid', () => String) profileUuid: number | string,
    @Arg('conversationUuid', () => String) conversationUuid: number | string,
    @Ctx() { req }: MyContext
  ) {
    try {
      const conversationToProfile = await ConversationToProfile.findOne({
        where: { conversationUuid: conversationUuid, profileUuid: profileUuid },
      })

      const result = await getConnection()
        .createQueryBuilder()
        .update(ConversationToProfile)
        .set({
          unreadMessages: conversationToProfile.unreadMessages + 1,
          profileThatHasUnreadMessages: profileUuid,
        })
        .where('conversationUuid = :conversationUuid', {
          conversationUuid,
        })
        .returning('*')
        .execute()

      console.log('result:', result)
      return true
    } catch (e) {
      return false
    }
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
