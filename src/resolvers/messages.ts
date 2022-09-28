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
import { Conversation } from '../entities/Conversation'
import { getConnection } from 'typeorm'
import { Profile } from '../entities/Profile'
import { Friend } from '../entities/Friend'
import { MyContext } from '../types'
import { ConversationToProfile } from '../entities/ConversationToProfile'
import { Message } from '../entities/Message'
import { Post } from '../entities/Post'
// import { GraphQLUpload, FileUpload } from 'graphql-upload'
const { GraphQLUpload, FileUpload } = require('graphql-upload-minimal')

import Redis from 'ioredis'
// import { FileUpload } from '../../../reddit-clone-web/src/pages/noon/FileUpload';
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
    @Arg('limit', () => Int) limit: number,
    @Arg('cursor', () => String) cursor: string | null,
    @Ctx() {}: MyContext
  ): Promise<PaginatedMessages> {
    const realLimit = Math.min(5, limit)
    const realLimitPlusOne = realLimit + 1
    const replacements: any[] = [realLimitPlusOne]

    if (cursor) {
      replacements.push(new Date(parseInt(cursor)))
    }

    const messages = await getConnection().query(
      `
      select m.*
      from message m
      ${cursor ? `where m."createdAt" < $2` : ''}
      order by m."createdAt" DESC
      limit $1
      `,
      replacements
    )

    return {
      messages: messages.slice(0, realLimit),
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
    console.log('GREGERGERGERGERGRE')
    if (file) {
      console.log('file:', file)
    }
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

        if (!session.connected) {
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
          req.session.user.profile,
          message,
          type,
          src
        )

        await messageRepository.save(saveMessage)
      }

      return null

      // const conversationProfileRepository = getConnection().getRepository(
      //   ConversationToProfile
      // )
    } catch (e) {
      console.log('error:', e)
      return null
    }

    return null
  }
}
