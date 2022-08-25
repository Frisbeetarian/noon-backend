import {
  Resolver,
  Query,
  Arg,
  FieldResolver,
  Root,
  Ctx,
  Mutation,
} from 'type-graphql'
import { Conversation } from '../entities/Conversation'
import { getConnection } from 'typeorm'
import { Profile } from '../entities/Profile'
import { Friend } from '../entities/Friend'
import { MyContext } from '../types'
import { ConversationToProfile } from '../entities/ConversationToProfile'
import { Message } from '../entities/Message'

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

  @Mutation(() => Message)
  async saveMessage(
    @Arg('message', () => String) message: string,
    @Arg('conversationUuid', () => String) conversationUuid: string,
    @Ctx() { req }: MyContext
  ): Promise<Message | null> {
    try {
      const messageRepository = getConnection().getRepository(Message)
      // const conversationRepository = getConnection().getRepository(Conversation)

      const conversation = await Conversation.findOne(conversationUuid)

      if (conversation) {
        let saveMessage = new Message(
          conversation,
          req.session.user.profile,
          message
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
