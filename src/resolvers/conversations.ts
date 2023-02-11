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

  // @FieldResolver(() => [ConversationToProfile])
  // conversations(@Root() profile: Profile | null) {
  //   return profile.conversationToProfiles
  // }

  @FieldResolver(() => [ConversationToProfile])
  calls(@Root() conversation: Conversation | null) {
    return conversation.calls
  }

  @FieldResolver(() => [Message])
  messages(@Root() conversation: Conversation | null) {
    return conversation.messages
  }

  @FieldResolver(() => Profile)
  pendingCallProfile(@Root() conversation: Conversation | null) {
    return conversation.pendingCallProfile
  }

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
      console.log('conversationUuid:', conversationUuid)
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
              calls.push({
                profileUuid: object.profile.uuid,
                profileUsername: object.profile.username,
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
                deleted: message.deleted,
                updatedAt: message.updatedAt,
                createdAt: message.createdAt,
                sender: {
                  uuid: message.senderUuid,
                  username: message.username,
                },
              })
            })

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
    try {
      const conversationProfileRepository = getConnection().getRepository(
        ConversationToProfile
      )

      let conversation = await Conversation.create({
        ...input,
      }).save()

      let participantsArray = []
      let calls = []

      await Promise.all(
        participants.map(async (participant) => {
          const profile = await Profile.findOne(participant)

          participantsArray.push({
            uuid: profile?.uuid,
            username: profile?.username,
          })

          calls.push({
            profileUuid: profile?.uuid,
            profileUsername: profile?.username,
            pendingCall: false,
            ongoingCall: false,
          })

          const conversationToProfile = new ConversationToProfile(
            conversation,
            profile,
            profile?.username
          )

          await conversationProfileRepository.save(conversationToProfile)
        })
      )

      return (conversation = {
        ...conversation,
        unreadMessages: 0,
        messages: [],
        calls,
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

    try {
      const conversation = await ConversationToProfile.findOne({
        where: [
          { profileUuid: loggedInProfileUuid },
          { profileUuid: profileUuid },
        ],
        relations: ['conversation', 'profile'],
      })

      if (conversation) {
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

        return objectToSend
      }
    } catch (e) {
      console.log('error:', e)
      return null
    }

    return null
  }
}
