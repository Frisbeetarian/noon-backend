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
const rpcClient = require('../utils/brokerInitializer')
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
      const { conversationUuid, conversationType, participantUuids } = req.body
      const file = req.file

      const participantUuidsArray = participantUuids.split(',')

      const senderProfile = await Profile.findOne({
        where: { userId: req.session.userId },
      })

      if (!senderProfile) {
        return res.status(404).json({ error: 'Sender profile not found' })
      }

      if (!file) {
        return res.status(400).json({ error: 'No file provided' })
      }

      const fileBuffer = file.buffer
      const filename = file.originalname
      const mimeType = file.mimetype

      const fileToSend = {
        buffer: fileBuffer,
        filename,
        mimeType,
      }

      const conversation = await Conversation.findOne(conversationUuid)

      const type = 'image'
      let message = new Message(conversation, senderProfile, '', type, '')
      message = await getConnection().getRepository(Message).save(message)

      await rpcClient.media().sendImage({
        task: 'upload-image',
        file: fileToSend,
        conversationUuid: conversationUuid,
        conversationType: conversationType,
        senderProfileUuid: senderProfile.uuid,
        senderProfileUsername: senderProfile?.username,
        messageUuid: message.uuid,
        participantUuids: participantUuidsArray ? participantUuidsArray : [],
      })

      return res.status(200)
    } catch (e) {
      console.error('Error saving file:', e.message)
      return res.status(500).json({ error: 'Internal server error' })
    }
  }

  static async saveVoiceRecording(req: Request, res: Response) {
    try {
      const { conversationUuid, conversationType, participantUuids } = req.body
      const file = req.file

      const participantUuidsArray = participantUuids.split(',')

      if (!file) {
        return res.status(400).json({ error: 'No voice recording provided' })
      }

      const senderProfile = await Profile.findOne({
        where: { userId: req.session.userId },
      })

      if (!senderProfile) {
        return res.status(404).json({ error: 'Sender profile not found' })
      }

      const fileBuffer = file.buffer
      const filename = file.originalname
      const mimeType = file.mimetype

      const fileToSend = {
        buffer: fileBuffer,
        filename,
        mimeType,
      }

      const conversation = await Conversation.findOne(conversationUuid)

      const type = 'audio'
      let message = new Message(conversation, senderProfile, '', type, '')
      message = await getConnection().getRepository(Message).save(message)

      await rpcClient.media().sendAudioRecording({
        task: 'upload-audio',
        file: fileToSend,
        conversationUuid: conversationUuid,
        conversationType: conversationType,
        senderProfileUuid: senderProfile.uuid,
        senderProfileUsername: senderProfile?.username,
        messageUuid: message.uuid,
        participantUuids: participantUuidsArray ? participantUuidsArray : [],
      })

      return res.status(200).json(message)
    } catch (e) {
      console.error('Error saving voice recording:', e.message)
      return res.status(500).json({ error: 'Internal server error' })
    }
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
    try {
      const { messageUuid, conversationUuid, from } = req.query

      const conversation = await Conversation.findOne({
        where: { uuid: conversationUuid },
        relations: ['messages', 'conversationToProfiles'],
      })

      console.log('conversation:', conversation)

      if (!conversation) {
        return res.status(404).json({ error: 'Conversation not found' })
      }

      if (req.session.user.profile.uuid !== from) {
        return res
          .status(403)
          .json({ error: 'Not authorized to delete this message' })
      }

      const message = await getConnection()
        .createQueryBuilder()
        .update(Message)
        .set({
          deleted: true,
          content: 'Message has been deleted.',
        })
        .where('uuid = :messageUuid', {
          messageUuid,
        })
        .returning('*')
        .execute()

      if (!message.affected) {
        return res.status(404).json({ error: 'Message not found' })
      }

      const io = getIO()
      const emitters = new Emitters(io)
      console.log('message.uuid:', message.raw[0].uuid)
      conversation.conversationToProfiles.forEach((profile) => {
        if (profile.profileUuid !== req.session.user.profile.uuid) {
          emitters.emitMessageDeleted(
            req.session.user.profile.uuid,
            req.session.user.profile.username,
            profile.profileUuid,
            profile.profileUsername,
            conversation.uuid,
            message.raw[0].uuid,
            'Message has been deleted'
          )
        }
      })

      return res.status(200).json({
        uuid: messageUuid,
        content: 'Message has been deleted.',
        deleted: true,
      })
    } catch (e) {
      console.error('Error:', e.message)
      return res.status(500).json({ error: 'Internal server error' })
    }
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
