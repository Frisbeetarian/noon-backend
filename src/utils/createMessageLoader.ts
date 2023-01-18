// @ts-nocheck
import DataLoader from 'dataloader'
import { Message } from '../entities/Message'
import { Conversation } from '../entities/Conversation'

export const createMessageLoader = () =>
  new DataLoader<string, Message>(async (conversationUuids: Conversation[]) => {
    // const users = await Message.findByIds(conversationUuids as string[])
    try {
      console.log('messages in loader:', conversationUuids)

      //   const conversationEntity = await Conversation.findOne({
      //     where: [{ uuid: conversation.conversationUuid }],
      //     relations: ['pendingCallProfile', 'messages'],
      //   })

      const messages = await Message.find({
        where: {
          conversation: conversationUuids.uuid,
        },
      })

      console.log('messages in loader:', messages)

      const messageUuidToMessage: Record<number, Message> = {}

      messages.forEach((m) => {
        messageUuidToMessage[conversationUuids] = m
      })

      return conversationUuids.map((uuid) => messageUuidToMessage[uuid])
    } catch (e) {
      console.log('error in message loader:', e)
      return null
    }
  })
