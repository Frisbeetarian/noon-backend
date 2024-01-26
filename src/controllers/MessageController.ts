import { Request, Response } from 'express'
import { getConnection } from 'typeorm'
import { Message } from '../entities/Message'
import { Profile } from '../entities/Profile'
import { Conversation } from '../entities/Conversation'
import { ConversationToProfile } from '../entities/ConversationToProfile'

import Redis from 'ioredis'
const redis = new Redis()
const { RedisSessionStore } = require('./../socketio/sessionStore')
const sessionStore = new RedisSessionStore(redis)

class MessageController {
  static async getMessagesForConversation(req: Request, res: Response) {
    const { conversationUuid, limit, cursor } = req.query

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
    console.log('cursor:', cursor)
    console.log('replacements:', replacements)

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

    let messagesToSend = []

    messages.forEach((message) => {
      messagesToSend.push({
        uuid: message.uuid,
        content: message.content,
        type: message.type,
        src: message.src,
        updatedAt: message.updatedAt,
        createdAt: message.createdAt,
        deleted: message.deleted,
        sender: {
          uuid: message.senderUuid,
          username: message.username,
        },
      })
    })

    return res.json({
      messages: messagesToSend,
      hasMore: messages.length === realLimitPlusOne,
    })
  }

  static async uploadImage(req: Request, res: Response) {
    // TODO: Implement file upload handling
  }

  static async uploadVoiceRecording(req: Request, res: Response) {
    // TODO: Implement file upload handling
  }

  static async saveGroupMessage(req: Request, res: Response) {
    // TODO: Implement save group message logic
  }

  static async deleteMessage(req: Request, res: Response) {
    // TODO: Implement delete message logic
  }

  static async saveMessage(req: Request, res: Response) {
    try {
      const { message, to, conversationUuid, type, src } = req.body

      const messageRepository = getConnection().getRepository(Message)
      // const conversationRepository = getConnection().getRepository(Conversation)

      const conversation = await Conversation.findOne(conversationUuid)
      const conversationToProfile = await ConversationToProfile.findOne({
        where: { conversationUuid: conversationUuid, profileUuid: to },
      })

      console.log(
        'conversationToProfile on save message:',
        conversationToProfile
      )

      if (conversation) {
        const session = await sessionStore.findSession(to)
        console.log('session on save message:', session)

        if (!session?.connected) {
          await getConnection()
            .createQueryBuilder()
            .update(ConversationToProfile)
            .set({
              unreadMessages: conversationToProfile?.unreadMessages + 1,
              profileThatHasUnreadMessages: to,
            })
            .where('conversationUuid = :conversationUuid', {
              conversationUuid,
            })
            .returning('*')
            .execute()
        } else {
          // Get timestamp from client to set on server, otherwise date discrepancies might occur
          await getConnection()
            .createQueryBuilder()
            .update(ConversationToProfile)
            .set({
              updatedAt: new Date(),
            })
            .where('conversationUuid = :conversationUuid', {
              conversationUuid,
            })
            .returning('*')
            .execute()
        }

        let saveMessage = new Message(
          conversation,
          // conversation.uuid,
          req.session.user.profile,
          message,
          type,
          src
        )

        return await messageRepository.save(saveMessage)
      }

      return null
    } catch (e) {
      console.log('error:', e)
      return null
    }

    return null
  }
}

export default MessageController
