// @ts-nocheck
import { Request, Response } from 'express'
import { getConnection } from 'typeorm'
import { ConversationToProfile } from '../entities/ConversationToProfile'
import { Conversation } from '../entities/Conversation'
import { Profile } from '../entities/Profile'
import { Message } from '../entities/Message'
import { getIO } from '../socketio/socket'
import Emitters from '../socketio/emitters'
import { checkFriendship } from '../neo4j/neo4j_calls/neo4j_api'

class ConversationController {
  static async getConversationsForLoggedInUser(req: Request, res: Response) {
    try {
      const loggedInProfileUuid = req.session.user.profile.uuid
      const objectToSend = []
      const realLimit = 20
      const conversationReplacements: any[] = [loggedInProfileUuid, 20]

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
      } else {
        return res.status(200).json([])
      }
    } catch (e) {
      console.log('error:', e.message)
      return res.status(500).json(e.message)
    }
  }

  static async checkIfConversationHasMoreMessages(req, res) {
    try {
      const { conversationUuid } = req.body

      const [count] = await Promise.all([
        Message.count({ where: { conversationUuid } }),
      ])

      return res.status(200).json(count > 20 ? true : false)
    } catch (e) {
      console.log('error:', e.message)
      return res.status(500).json(e.message)
    }
  }

  static async createGroupConversation(req, res) {
    const connection = getConnection()
    const queryRunner = connection.createQueryRunner()

    await queryRunner.connect()
    await queryRunner.startTransaction()

    try {
      const { input, participants } = req.body
      const senderProfile = await Profile.findOne({
        where: { userId: req.session.userId },
      })

      if (!senderProfile) {
        return res.status(404).json({ error: 'Sender profile not found' })
      }

      const conversationProfileRepository = getConnection().getRepository(
        ConversationToProfile
      )

      let conversation = new Conversation()
      Object.assign(conversation, input)
      conversation = await queryRunner.manager.save(conversation)

      const profiles = await queryRunner.manager.findByIds(
        Profile,
        participants
      )

      let conversationsToProfiles = []

      for (const profile of profiles) {
        if (profile.uuid !== senderProfile.uuid) {
          const areFriends = await checkFriendship(
            senderProfile?.uuid,
            profile?.uuid
          )

          if (!areFriends) {
            await queryRunner.rollbackTransaction()
            await queryRunner.release()
            return res.status(400).json({
              error: 'All participants must be friends with the sender.',
            })
          }
        }

        const conversationToProfile = new ConversationToProfile()
        conversationToProfile.conversation = conversation
        conversationToProfile.profile = profile
        conversationToProfile.profileUsername = senderProfile.username
        conversationsToProfiles.push(conversationToProfile)
      }

      // Bulk insert participants
      await queryRunner.manager.save(conversationsToProfiles)
      await queryRunner.commitTransaction()

      conversation = {
        ...conversation,
        profiles: profiles.map((profile) => ({
          uuid: profile.uuid,
          username: profile.username,
        })),
        unreadMessages: 0,
        messages: [],
        calls: [],
        ongoingCall: false,
        pendingCall: false,
        pendingCallProfile: null,
      }

      const io = getIO()
      const emitters = new Emitters(io)
      const content = senderProfile.username + ' added you to a group.'

      profiles.forEach((profile) => {
        emitters.emitAddedToGroup(
          senderProfile.uuid,
          senderProfile.username,
          profile.uuid,
          profile.username,
          conversation.uuid,
          content,
          conversation
        )
      })

      return res.status(200).json(conversation)
    } catch (e) {
      console.log('error:', e.message)
      return res.status(500).json(e.message)
    }
  }

  static async leaveGroup(req, res) {
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

  //
  static async setPendingCallForConversation(req, res) {
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

  static async cancelPendingCallForConversation(req, res) {
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

  static async clearUnreadMessagesForConversation(req, res) {
    try {
      const { conversationUuid } = req.body

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
      return res.status(200)
    } catch (e) {
      console.log(e.message)
      return res.status(500).json(e.message)
    }
  }
  static async updateUnreadMessagesForConversation(req, res) {
    try {
      const { conversationUuid, profileUuid } = req.body

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

  async getConversationsByProfileUuid(req, res) {
    try {
      const { profileUuid } = req.body
      const loggedInProfileUuid = req.session.user.profile.uuid

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

        return res.status(200).json(objectToSend)
      } else {
        return res.status(404).json('Conversation not found')
      }
    } catch (e) {
      console.log('error:', e)
      return null
    }

    return null
  }
}

export default ConversationController
