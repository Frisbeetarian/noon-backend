import { Request, Response } from 'express'
import { getConnection } from 'typeorm'
// import { Conversation } from '../entities/Conversation'
import { ConversationToProfile } from '../entities/ConversationToProfile'
import { Conversation } from '../entities/Conversation'
import { Profile } from '../entities/Profile'
// import { Message } from '../entities/Message'
// import { Profile } from '../entities/Profile'

class ConversationController {
  static async getConversationsForLoggedInUser(req: Request, res: Response) {
    const loggedInProfileUuid = req.session.user.profile.uuid
    const objectToSend = []

    const realLimit = 20
    // const realLimitPlusOne = realLimit + 1
    // let cursor = null

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

            replacements.push(conversationEntity?.uuid)

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

        return res.status(200).json(objectToSend)
      }
    } catch (e) {
      console.log('error:', e.message)
      return res.status(500).json(e.message)
    }
  }
  // async checkIfConversationHasMoreMessages(req, res) {
  //   // Logic for checkIfConversationHasMoreMessages
  // }
  //
  // async createGroupConversation(req, res) {
  //   // Logic for createGroupConversation
  // }
  //
  async leaveGroup(req, res) {
    try {
      const { groupUuid } = req.body

      await getConnection()
        .createQueryBuilder()
        .delete()
        .from(ConversationToProfile)
        .where('conversationUuid = :groupUuid and profileUuid = :profileUuid', {
          groupUuid,
          profileUuid: req.session.user.profile.uuid,
        })
        .execute()

      return res.status(200)
    } catch (e) {
      console.log('error:', e.message)
      return res.status(500).json(e.message)
    }
  }

  async createGroupConversation(req, res) {
    try {
      const { input, participants } = req.body

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

      conversation = {
        ...conversation,
        unreadMessages: 0,
        messages: [],
        calls,
        ongoingCall: false,
        pendingCall: false,
        pendingCallProfile: null,
        profiles: participantsArray,
      }

      return res.status(200).json(conversation)

      // return (conversation = {
      //   ...conversation,
      //   unreadMessages: 0,
      //   messages: [],
      //   calls,
      //   ongoingCall: false,
      //   pendingCall: false,
      //   pendingCallProfile: null,
      //   profiles: participantsArray,
      // })
    } catch (e) {
      console.log(e.message)
      return res.status(500).json(e.message)
    }
  }

  //
  async setPendingCallForConversation(req, res) {
    try {
      const { conversationUuid, profileUuid } = req.body

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

      return res.status(200)
    } catch (e) {
      console.log(e.message)
      return res.status(500).json(e.message)
    }
  }

  async cancelPendingCallForConversation(req, res) {
    try {
      const { conversationUuid, profileUuid } = req.body

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
      return res.status(200)
    } catch (e) {
      console.log(e.message)
      return res.status(500).json(e.message)
    }
  }
  //
  // async clearUnreadMessagesForConversation(req, res) {
  //   // Logic for clearUnreadMessagesForConversation
  // }
  //
  // async updateUnreadMessagesForConversation(req, res) {
  //   // Logic for updateUnreadMessagesForConversation
  // }
  //
  // async getConversationsByProfileUuid(req, res) {
  //   // Logic for getConversationsByProfileUuid
  // }
}

export default ConversationController
