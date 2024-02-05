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
      const realLimit = 20

      const conversationProfiles = await ConversationToProfile.find({
        where: { profileUuid: loggedInProfileUuid },
        relations: ['conversation', 'profile'],
        order: { createdAt: 'DESC' },
        take: realLimit,
      })

      const objectToSend = await Promise.all(
        conversationProfiles.map(async (conversationProfile) => {
          const conversationEntity = conversationProfile.conversation

          const profiles = await ConversationToProfile.find({
            where: { conversationUuid: conversationEntity.uuid },
            relations: ['profile'],
          })

          const profilesToSend = profiles.map((cp) => cp.profile)

          const [messages, calls] = await Promise.all([
            Message.find({
              where: { conversationUuid: conversationEntity.uuid },
              order: { createdAt: 'DESC' },
              take: realLimit,
            }),
            ConversationToProfile.find({
              where: { conversationUuid: conversationEntity.uuid },
            }),
          ])

          const messagesToSend = messages.map((message) => ({
            uuid: message.uuid,
            content: message.content,
            type: message.type,
            src: message.src,
            deleted: message.deleted,
            updatedAt: message.updatedAt,
            createdAt: message.createdAt,
            sender: {
              uuid: message.senderUuid,
              username: message.sender.username,
            },
          }))

          // const callsToSend = calls.map((call) => ({
          //   profileUuid: call.profile.uuid,
          //   profileUsername: call.profile.username,
          //   pendingCall: call.pendingCall,
          //   ongoingCall: call.ongoingCall,
          // }));

          return {
            uuid: conversationEntity.uuid,
            unreadMessages: conversationEntity.unreadMessages,
            profileThatHasUnreadMessages:
              conversationEntity.profileThatHasUnreadMessages,
            ongoingCall: conversationEntity.ongoingCall,
            pendingCall: conversationEntity.pendingCall,
            pendingCallProfile: conversationEntity.pendingCallProfile,
            calls: [],
            profiles: profilesToSend,
            type: conversationEntity.type,
            name: conversationEntity.name,
            description: conversationEntity.description,
            messages: messagesToSend,
            hasMore: messages.length === realLimit,
            updatedAt: conversationEntity.updatedAt,
            createdAt: conversationEntity.createdAt,
          }
        })
      )

      return res.status(200).json(objectToSend)
    } catch (e) {
      console.error('Error:', e.message)
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
        if (profile.uuid !== senderProfile.uuid) {
          emitters.emitAddedToGroup(
            senderProfile.uuid,
            senderProfile.username,
            profile.uuid,
            profile.username,
            conversation.uuid,
            content,
            conversation
          )
        }
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

      const senderProfile = await Profile.findOne({
        where: { userId: req.session.userId },
      })

      if (!senderProfile) {
        return res.status(404).json({ error: 'Sender profile not found' })
      }

      await getConnection()
        .createQueryBuilder()
        .delete()
        .from(ConversationToProfile)
        .where('conversationUuid = :groupUuid and profileUuid = :profileUuid', {
          groupUuid,
          profileUuid: req.session.user.profile.uuid,
        })
        .execute()

      return res.status(200).json("You've left the group.")
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
