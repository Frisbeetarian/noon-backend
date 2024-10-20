// @ts-nocheck
import { Request, Response } from 'express'
import { getConnection } from 'typeorm'
import { ConversationToProfile } from '../models/ConversationToProfile'
import { Conversation } from '../models/Conversation'
import { Profile } from '../models/Profile'
import { Message } from '../models/Message'
import { getIO } from '../socketio/socket'
import Emitters from '../socketio/emitters'
import { EncryptedKey } from '../models/EncryptedKey'

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
            relations: ['profile', 'profile.user'],
          })

          const profilesToSend = profiles.map((cp) => ({
            uuid: cp.profile.uuid,
            username: cp.profile.username,
            publicKey: cp.profile.user.publicKey,
          }))

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

          const messagesToSend = await Promise.all(
            messages.map(async (message) => {
              const encryptedKeysForMessage = await EncryptedKey.find({
                where: {
                  messageUuid: message.uuid,
                  recipientUuid: loggedInProfileUuid,
                },
              })

              const encryptedKeyForUser =
                encryptedKeysForMessage.length > 0
                  ? encryptedKeysForMessage[0].encryptedKey
                  : null

              return {
                uuid: message.uuid,
                content: message.content,
                type: message.type,
                src: message.src,
                deleted: message.deleted,
                updatedAt: message.updatedAt,
                createdAt: message.createdAt,
                encryptedKey: encryptedKeyForUser,
                sender: {
                  uuid: message.sender.uuid,
                  username: message.sender.username,
                },
              }
            })
          )

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

  static async getMessagesForConversation(req: Request, res: Response) {
    try {
      const loggedInProfileUuid = req.session.user.profile.uuid

      const { conversationUuid } = req.params
      const { limit, cursor } = req.query

      if (conversationUuid === null) {
        return res.json({
          messages: [],
          hasMore: false,
        })
      }

      const realLimit = Math.min(20, Number(limit))
      const realLimitPlusOne = realLimit + 1
      const replacements: any[] = [realLimitPlusOne]

      if (cursor) {
        replacements.push(new Date(parseInt(cursor as string)))
      }

      replacements.push(conversationUuid)

      const messages = await getConnection().query(
        `
      select profile.uuid, profile.username, message.*
      from profile
      LEFT JOIN message ON message."senderUuid" = profile.uuid
      ${
        cursor
          ? `where message."conversationUuid" = $3 and message."createdAt" < $2`
          : `where message."conversationUuid" = $2`
      }
      order by message."createdAt" DESC
      limit $1
      `,
        replacements
      )

      const messagesToSend = await Promise.all(
        messages.map(async (message) => {
          const encryptedKeysForMessage = await EncryptedKey.find({
            where: {
              messageUuid: message.uuid,
              recipientUuid: loggedInProfileUuid,
            },
          })

          const encryptedKeyForUser =
            encryptedKeysForMessage.length > 0
              ? encryptedKeysForMessage[0].encryptedKey
              : null

          return {
            uuid: message.uuid,
            content: message.content,
            type: message.type,
            src: message.src,
            deleted: message.deleted,
            updatedAt: message.updatedAt,
            createdAt: message.createdAt,
            encryptedKey: encryptedKeyForUser,
            sender: {
              uuid: message.senderUuid,
              username: message.username,
            },
          }
        })
      )

      console.log('messages to send:', messagesToSend)

      return res.status(200).json({
        messages: messagesToSend,
        hasMore: messages.length === realLimitPlusOne,
      })
    } catch (e) {
      console.log('Message error:', e.message)
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

      // const profiles = await queryRunner.manager.findByIds(
      //   Profile,
      //   participants
      // )

      const profiles = await Promise.all(
        participants.map(async (participantUuid) => {
          return await Profile.findOne({
            where: { uuid: participantUuid },
            relations: ['user'],
          })
        })
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

      await queryRunner.manager.save(conversationsToProfiles)
      await queryRunner.commitTransaction()
      conversation = {
        ...conversation,
        profiles: profiles.map((profile) => ({
          uuid: profile.uuid,
          username: profile.username,
          publicKey: profile.user?.publicKey,
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
      await queryRunner.rollbackTransaction()
      await queryRunner.release()
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
