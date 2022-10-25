import {
  Resolver,
  Query,
  Arg,
  FieldResolver,
  Root,
  Ctx,
  Field,
  Mutation,
  InputType,
} from 'type-graphql'

import { Conversation } from '../entities/Conversation'
import { getConnection } from 'typeorm'
import { Profile } from '../entities/Profile'

import { Friend } from '../entities/Friend'
import { MyContext } from '../types'
import { ConversationToProfile } from '../entities/ConversationToProfile'
import { Message } from '../entities/Message'

@InputType()
class GroupInput {
  @Field()
  name: string
  @Field()
  description: string
  @Field()
  type: string
}

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

  @FieldResolver(() => [ConversationToProfile])
  calls(@Root() conversation: Conversation | null) {
    return conversation.calls
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

  // @FieldResolver(() => Boolean)
  // hasMore(@Root() conversation: Conversation | null) {
  //   return conversation.hasMore
  // }

  // @FieldResolver(() => Conversation)
  // unreadMessages(@Root() conversation: Conversation | null) {
  //   return conversation?.unreadMessages
  // }

  // @FieldResolver(() => ConversationToProfile)
  // profileThatHasUnreadMessages(@Root() conversation: Conversation | null) {
  //   return conversation?.profileThatHasUnreadMessages
  // }

  @Query(() => Boolean)
  async checkIfConversationHasMoreMessages(
    @Arg('conversationUuid', () => String) conversationUuid: number | string,
    @Ctx() { req }: MyContext
  ): Promise<Boolean> {
    console.log('count in check conversation')

    try {
      const [count] = await Promise.all([
        Message.count({ where: { conversationUuid } }),
      ])

      console.log('count in check conversation:', count)
      return count > 20 ? true : false
    } catch (e) {
      console.log('error:', e)
      return false
    }

    // if(count > 20) return true else return false
  }

  @Query(() => [Conversation], { nullable: true })
  async getConversationForLoggedInUser(
    @Ctx() { req }: MyContext
  ): Promise<Conversation | null> {
    const loggedInProfileUuid = req.session.user.profile.uuid
    const objectToSend = []

    const realLimit = 20
    const realLimitPlusOne = realLimit + 1
    let cursor = null

    const conversationReplacements: any[] = [loggedInProfileUuid, 20]

    try {
      // const conversations = await ConversationToProfile.find({
      //   where: [{ profileUuid: loggedInProfileUuid }],
      //   relations: ['conversation', 'profile'],
      // })

      // const conversations = await Conversation
      // const conversationsOnJoin = await getConnection().query(
      //   `
      // select conversation.uuid, conversation_profile.*
      // from conversation
      // LEFT JOIN conversation_profile ON conversation_profile."conversationUuid" = conversation.uuid
      // ${`where conversation_profile."profileUuid" = $1`}
      // order by conversation_profile."createdAt" DESC
      // limit $2
      // `,
      //   conversationReplacements
      // )

      const conversations = await getConnection().query(
        `
        select conversation_profile.*, conversation.*
        from conversation_profile
        LEFT JOIN conversation ON conversation_profile."conversationUuid" = conversation.uuid
        ${`where conversation_profile."profileUuid" = $1`}
        order by conversation_profile."createdAt" DESC
        limit $2
      `,
        conversationReplacements
      )

      // const messages = await getConnection().query(
      //   `
      // select profile.uuid, profile.username, message.*
      // from profile
      // LEFT JOIN message ON message."senderUuid" = profile.uuid
      // ${`where message."conversationUuid" = $2`}
      // order by message."createdAt" DESC
      // limit $1
      // `,
      //   replacements
      // )

      console.log('conversations newnew:', conversations)

      if (conversations) {
        await Promise.all(
          conversations.map(async (conversation) => {
            const replacements: any[] = [20]

            const conversationObject = await ConversationToProfile.find({
              where: [{ conversationUuid: conversation.conversationUuid }],
              relations: ['conversation', 'profile'],
            })

            const conversationEntity = await Conversation.findOne({
              where: [{ uuid: conversation.conversationUuid }],
              relations: ['pendingCallProfile', 'messages'],
            })

            replacements.push(conversationEntity.uuid)

            // console.log('conversation entity:', conversationEntity)
            console.log('conversationObject:', conversationObject)
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
            let profilesToSend = []
            let calls = []

            conversationObject.map((object) => {
              // console.log('conversation profile object:', object.profile)
              calls.push({
                profileUuid: object.profile.uuid,
                pendingCall: object.pendingCall,
                ongoingCall: object.ongoingCall,
              })
              profilesToSend.push(object.profile)
            })

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
              uuid: conversation.conversationUuid,
              unreadMessages: conversation.unreadMessages,
              profileThatHasUnreadMessages:
                conversation.profileThatHasUnreadMessages,
              ongoingCall: conversation.ongoingCall,
              pendingCall: conversation.pendingCall,
              pendingCallProfile: conversation.pendingCallProfile,
              calls: calls,
              profiles: profilesToSend,
              type: conversation.type,
              name: conversation.name,
              description: conversation.description,
              messages: messagesToSend,
              hasMore: messages.length === realLimit,
              updatedAt: conversation.updatedAt,
              createdAt: conversation.createdAt,
            })

            // console.log('messages.length:', messages.length)
            // console.log('realLimitPlusOne:', realLimitPlusOne)
          })
        )

        return objectToSend
      }
    } catch (e) {
      console.log('error:', e)
      return null
    }

    return objectToSend
  }

  @Mutation(() => Boolean)
  async leaveGroup(
    @Arg('groupUuid', () => String) groupUuid: string,
    @Ctx() { req }: MyContext
  ): Promise<Boolean> {
    try {
      // const profile = await Profile.findOne({
      //   where: { uuid: req.session.userId },
      // })

      // .where('id = :id and "creatorId" = :creatorId', {
      //   id,
      //   creatorId: req.session.userId,
      // })

      // if (profile) {
      await getConnection()
        .createQueryBuilder()
        .delete()
        .from(ConversationToProfile)
        .where('conversationUuid = :groupUuid and profileUuid = :profileUuid', {
          groupUuid,
          profileUuid: req.session.user.profile.uuid,
        })
        .execute()
      // }

      return true
    } catch (e) {
      console.log('error:', e)
      return false
    }
    return false
  }

  @Mutation(() => Conversation)
  async createGroupConversation(
    @Arg('input') input: GroupInput,
    @Arg('participants', () => [String]) participants: [string],
    @Ctx() { req }: MyContext
  ): Promise<Conversation> {
    console.log('input in create group function:', input)
    console.log('participants in create group function:', participants)

    try {
      const conversationProfileRepository = getConnection().getRepository(
        ConversationToProfile
      )

      let conversation = await Conversation.create({
        ...input,
      }).save()

      // let conversation = new Conversation()
      // await conversationRepository.save(conversation)

      let participantsArray = []

      // const [count] = await Promise.all([
      //   Message.count({ where: { conversationUuid } }),
      // ])

      await Promise.all(
        participants.map(async (participant) => {
          const profile = await Profile.findOne(participant)

          participantsArray.push({
            uuid: profile?.uuid,
            username: profile?.username,
          })

          const conversationToProfile = new ConversationToProfile(
            conversation,
            profile
          )

          await conversationProfileRepository.save(conversationToProfile)
        })
      )

      return (conversation = {
        ...conversation,
        unreadMessages: 0,
        messages: [],
        calls: [],
        ongoingCall: false,
        pendingCall: false,
        pendingCallProfile: null,
        profiles: participantsArray,
      })
    } catch (e) {
      console.log(e)
      return null
    }
  }

  @Mutation(() => Boolean)
  async setPendingCallForConversation(
    @Arg('conversationUuid', () => String) conversationUuid: number | string,
    @Arg('profileUuid', () => String)
    profileUuid: string,
    @Ctx() { req }: MyContext
  ) {
    try {
      console.log('pending call conversation uuid:', conversationUuid)
      console.log('pending call initiating:', profileUuid)

      await getConnection()
        .createQueryBuilder()
        .update(ConversationToProfile)
        .set({
          pendingCall: true,
        })
        .where(
          'conversationUuid = :conversationUuid and profileUuid = :profileUuid',
          {
            conversationUuid,
            profileUuid,
          }
        )
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
    @Arg('profileUuid', () => String)
    profileUuid: string,
    @Ctx() { req }: MyContext
  ) {
    try {
      // console.log('cancel pending call conversation uuid:', conversationUuid)

      await getConnection()
        .createQueryBuilder()
        .update(ConversationToProfile)
        .set({
          pendingCall: false,
        })
        .where(
          'conversationUuid = :conversationUuid and profileUuid = :profileUuid',
          {
            conversationUuid,
            profileUuid,
          }
        )
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
