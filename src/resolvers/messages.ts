// @ts-nocheck
import {
  Resolver,
  Query,
  Arg,
  FieldResolver,
  Int,
  Root,
  Ctx,
  Mutation,
  ObjectType,
  Field,
} from 'type-graphql'
import * as fs from 'fs'
import { Conversation } from '../entities/Conversation'
import { getConnection } from 'typeorm'
import { Profile } from '../entities/Profile'
import { MyContext } from '../types'
import { ConversationToProfile } from '../entities/ConversationToProfile'
import { Message } from '../entities/Message'
const { GraphQLUpload, FileUpload } = require('graphql-upload-minimal')
import Redis from 'ioredis'
import rpcClient from '../utils/brokerInitializer'
const redis = new Redis()

const { RedisSessionStore } = require('./../socketio/sessionStore')
const sessionStore = new RedisSessionStore(redis)

@ObjectType()
class PaginatedMessages {
  @Field(() => [Message])
  messages: Message[]
  @Field()
  hasMore: boolean
}

@Resolver(Conversation)
export class MessageResolver {
  @FieldResolver(() => [Profile])
  profiles(@Root() conversation: Conversation | null) {
    return conversation.profiles
  }

  @FieldResolver(() => [ConversationToProfile])
  conversations(@Root() profile: Profile | null) {
    return profile.conversationToProfiles
  }

  @Query(() => PaginatedMessages)
  async getMessagesForConversation(
    @Arg('conversationUuid', () => String) conversationUuid: string,
    @Arg('limit', () => Int) limit: number,
    @Arg('cursor', () => String, { nullable: true }) cursor: string | null,
    @Ctx() {}: MyContext
  ): Promise<PaginatedMessages> {
    if (conversationUuid === null) {
      return {
        messages: [],
        hasMore: false,
      }
    }

    const realLimit = Math.min(20, limit)
    const realLimitPlusOne = realLimit + 1
    const replacements: any[] = [realLimitPlusOne]

    if (cursor) {
      replacements.push(new Date(parseInt(cursor)))
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

    // console.log('messages:', messages)
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

    return {
      messages: messagesToSend,
      hasMore: messages.length === realLimitPlusOne,
    }
  }

  @Mutation(() => Message)
  async uploadImage(
    @Arg('profileUuid', () => String) profileUuid: string,
    @Arg('conversationUuid', () => String) conversationUuid: string,
    @Arg('file', () => GraphQLUpload, { nullable: true }) file: FileUpload,
    @Ctx() { req }: MyContext
  ) {
    let message = null

    if (file) {
      try {
        const chunks = []
        const readStream = file.createReadStream()

        readStream.on('data', (chunk) => {
          chunks.push(chunk)
        })

        return new Promise((resolve) => {
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
            let saveMessage = new Message(
              conversation,
              sender,
              response,
              type,
              src
            )

            message = await messageRepository.save(saveMessage)
            resolve(message)
          })
        })
      } catch (e) {
        console.log('error:', e)
        return false
      }
    }

    return false
  }

  @Mutation(() => Message)
  async uploadVoiceRecording(
    @Arg('profileUuid', () => String) profileUuid: string,
    @Arg('conversationUuid', () => String) conversationUuid: string,
    @Arg('file', () => GraphQLUpload, { nullable: true }) file: FileUpload,
    @Ctx() { req }: MyContext
  ) {
    let message = null
    console.log('file:', file)
    if (file) {
      try {
        const chunks = []
        const readStream = file.createReadStream()

        readStream.on('data', (chunk) => {
          chunks.push(chunk)
        })

        return new Promise((resolve) => {
          readStream.on('end', async () => {
            const buffer = Buffer.concat(chunks)

            const response = await rpcClient.media().sendAudioRecording({
              task: 'upload-audio-recording',
              file,
              readStream: buffer,
            })

            const conversation = await Conversation.findOne(conversationUuid)
            const sender = await Profile.findOne(profileUuid)
            const messageRepository = getConnection().getRepository(Message)

            let type = 'audio'
            let src = response
            let saveMessage = new Message(
              conversation,
              sender,
              response,
              type,
              src
            )

            message = await messageRepository.save(saveMessage)
            resolve(message)
          })
        })
      } catch (e) {
        console.log('error:', e)
        return false
      }
    }

    return false
  }

  @Mutation(() => Message)
  async saveGroupMessage(
    @Arg('message', () => String) message: string,
    @Arg('conversationUuid', () => String) conversationUuid: string,
    @Arg('type', () => String) type: string,
    @Arg('src', () => String) src: string,
    @Ctx() { req }: MyContext
  ): Promise<Message | null> {
    try {
      const messageRepository = getConnection().getRepository(Message)
      const conversation = await Conversation.findOne(conversationUuid)

      const conversationToProfiles = await ConversationToProfile.find({
        where: { conversationUuid },
      })

      if (conversation) {
        conversationToProfiles.map(async (conversationToProfile) => {
          const session = await sessionStore.findSession(
            conversationToProfile.profileUuid
          )

          if (!session?.connected) {
            await getConnection()
              .createQueryBuilder()
              .update(ConversationToProfile)
              .set({
                unreadMessages: conversationToProfile.unreadMessages + 1,
                profileThatHasUnreadMessages: conversationToProfile.profileUuid,
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
        })

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
  }

  @Mutation(() => Message)
  async deleteMessage(
    @Arg('messageUuid', () => String) messageUuid: string,
    @Arg('conversationUuid', () => String) conversationUuid: string,
    @Arg('type', () => String) type: string,
    @Arg('src', () => String) src: string,
    @Arg('from', () => String) from: string,
    @Ctx() { req }: MyContext
  ): Promise<Message | null> {
    try {
      const conversation = await Conversation.findOne(conversationUuid)

      if (conversation && from === req.session.user.profile.uuid) {
        // const messageRepository = getConnection().getRepository(Message)
        // const message = await Message.findOne(messageUuid)
        console.log('entered update')
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
        console.log('message has been deleted')

        return {
          uuid: messageUuid,
          content: 'Message has been deleted.',
          deleted: true,
        }
      }
    } catch (e) {
      console.log('error:', e)
      return false
    }
    return false
  }

  @Mutation(() => Message)
  async saveMessage(
    @Arg('message', () => String) message: string,
    @Arg('to', () => String) to: string,
    @Arg('conversationUuid', () => String) conversationUuid: string,
    @Arg('type', () => String) type: string,
    @Arg('src', () => String) src: string,
    @Ctx() { req }: MyContext
  ): Promise<Message | null> {
    try {
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
