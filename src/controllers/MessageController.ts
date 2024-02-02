// @ts-nocheck
import { Request, Response } from 'express'
import { getConnection } from 'typeorm'
import { Message } from '../entities/Message'
import { Profile } from '../entities/Profile'
import { Conversation } from '../entities/Conversation'
import { ConversationToProfile } from '../entities/ConversationToProfile'

import Redis from 'ioredis'
import { getIO } from '../socketio/socket'
import Emitters from '../socketio/emitters'
import rpcClient from '../utils/brokerInitializer'
const redis = new Redis()
const { RedisSessionStore } = require('./../socketio/sessionStore')
const sessionStore = new RedisSessionStore(redis)

class MessageController {
  static async getMessagesForConversation(req: Request, res: Response) {
    try {
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

      return res.status(200).json({
        messages: messagesToSend,
        hasMore: messages.length === realLimitPlusOne,
      })
    } catch (e) {
      console.log('Message error:', e.message)
      return res.status(500).json(e.message)
    }
  }

  static async saveFile(req: Request, res: Response) {
    try {
      const { file, conversationUuid, profileUuid } = req.body

      if (!file) {
        return res.status(400).json({ error: 'No file provided' })
      }

      const chunks = []
      const readStream = file.createReadStream()

      readStream.on('data', (chunk) => {
        chunks.push(chunk)
      })

      new Promise((resolve) => {
        readStream.on('end', async () => {
          const buffer = Buffer.concat(chunks)

          const response = await rpcClient.media().sendImage({
            task: 'upload-image',
            file,
            readStream: buffer,
          })

          console.log('response:', response)
          const conversation = await Conversation.findOne(conversationUuid)
          const sender = await Profile.findOne(profileUuid)
          const messageRepository = getConnection().getRepository(Message)

          let type = 'image'
          let src = response

          let message = new Message(
            conversation,
            sender,
            response,
            type,
            response
          )

          message = await getConnection().getRepository(Message).save(message)

          resolve(message)
        })
      })

      return res.status(200)
    } catch (e) {
      console.error('Error saving group message:', e.message)
      return res.status(500).json({ error: 'Internal server error' })
    }
  }

  static async uploadVoiceRecording(req: Request, res: Response) {
    // TODO: Implement file upload handling
  }

  static async handleGroupMessage(req: Request, res: Response) {
    const connection = getConnection()
    const queryRunner = connection.createQueryRunner()

    await queryRunner.connect()
    await queryRunner.startTransaction()

    try {
      const { message, conversationUuid, type, src } = req.body
      const senderProfile = await Profile.findOne({
        where: { userId: req.session.userId },
      })

      if (!senderProfile) {
        return res.status(404).json({ error: 'Sender profile not found' })
      }

      const messageRepository = queryRunner.manager.getRepository(Message)
      const conversation = await queryRunner.manager.findOne(
        Conversation,
        conversationUuid
      )

      if (!conversation) {
        await queryRunner.rollbackTransaction()
        return res.status(400).json({ error: 'Conversation not found' })
      }

      const conversationToProfiles = await queryRunner.manager.find(
        ConversationToProfile,
        {
          where: { conversationUuid },
        }
      )

      const updatePromises = conversationToProfiles.map(async (ctp) => {
        const session = await sessionStore.findSession(ctp.profileUuid)
        if (!session?.connected) {
          ctp.unreadMessages += 1
          ctp.profileThatHasUnreadMessages = ctp.profileUuid
        }
        // Assuming updatedAt is automatically handled by TypeORM or database triggers
        return queryRunner.manager.save(ctp)
      })

      await Promise.all(updatePromises)

      let newMessage = messageRepository.create({
        conversation,
        sender: senderProfile,
        content: message,
        type,
        src,
      })
      const savedMessage = await queryRunner.manager.save(newMessage)

      await queryRunner.commitTransaction()

      const io = getIO()
      const emitters = new Emitters(io)
      const content = senderProfile.username + ' sent a message to the group.'

      conversationToProfiles.forEach((profile) => {
        if (profile.profileUuid !== senderProfile.uuid) {
          emitters.emitSendMessage(
            senderProfile.uuid,
            senderProfile.username,
            profile.profileUuid,
            profile.profileUsername,
            conversation.uuid,
            content,
            newMessage
          )
        }
      })

      return res.status(200).json(savedMessage)
    } catch (e) {
      await queryRunner.rollbackTransaction()
      console.error('Error saving group message:', e.message)
      return res.status(500).json({ error: 'Internal server error' })
    } finally {
      await queryRunner.release()
    }
  }

  static async deleteMessage(req: Request, res: Response) {
    // TODO: Implement delete message logic
  }

  static async handleMessage(req: Request, res: Response) {
    try {
      const {
        message,
        recipientUuid,
        recipientUsername,
        conversationUuid,
        type,
        src,
      } = req.body

      const senderProfile = await Profile.findOne({
        where: { userId: req.session.userId },
      })

      if (!senderProfile) {
        return res.status(404).json({ error: 'Sender profile not found' })
      }

      const messageRepository = getConnection().getRepository(Message)
      // const conversationRepository = getConnection().getRepository(Conversation)

      const conversation = await Conversation.findOne(conversationUuid)
      const conversationToProfile = await ConversationToProfile.findOne({
        where: {
          conversationUuid: conversationUuid,
          profileUuid: recipientUuid,
        },
      })

      if (conversation) {
        const session = await sessionStore.findSession(recipientUuid)
        // console.log('session on save message:', session)

        if (!session?.connected) {
          await getConnection()
            .createQueryBuilder()
            .update(ConversationToProfile)
            .set({
              unreadMessages: conversationToProfile?.unreadMessages + 1,
              profileThatHasUnreadMessages: recipientUuid,
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
          req.session.user.profile,
          message,
          type,
          src
        )

        const result = await messageRepository.save(saveMessage)

        const io = getIO()
        const emitters = new Emitters(io)
        const content = senderProfile.username + ' sent you a message.'

        emitters.emitSendMessage(
          senderProfile.uuid,
          senderProfile.username,
          recipientUuid,
          recipientUsername,
          conversationUuid,
          content,
          result
        )

        return res.status(200).json(result)
      } else {
        return res.status(400).json({ error: 'Conversation not found' })
      }
    } catch (e) {
      console.log('Message error:', e.message)
      return res.status(500).json(e.message)
    }
  }
}

export default MessageController
