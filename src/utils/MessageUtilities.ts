import { getConnection, Repository } from 'typeorm'
import { Message } from '../entities/Message'
import { getIO } from '../socketio/socket'
import Emitters from '../socketio/emitters'

export class MessageUtilities {
  static async updateMessagePath(
    messageUuid: string,
    filePath: string,
    type: string,
    conversationUuid: string,
    conversationType: string,
    senderProfileUuid: string,
    senderProfileUsername: string,
    participantUuids: string[]
  ): Promise<void> {
    try {
      const messageRepository: Repository<Message> =
        getConnection().getRepository(Message)

      // @ts-ignore
      const messageToUpdate: Message | undefined =
        // @ts-ignore
        await messageRepository.findOne({ where: { uuid: messageUuid } })

      if (messageToUpdate) {
        messageToUpdate.src = filePath
        messageToUpdate.type = type
        await messageRepository.save(messageToUpdate)

        const io = getIO()
        const emitters = new Emitters(io)

        participantUuids.forEach((recipientProfileUuid) => {
          emitters.emitSendFile(
            senderProfileUuid,
            senderProfileUsername,
            recipientProfileUuid,
            conversationUuid,
            conversationType,
            messageUuid,
            type,
            filePath
          )
        })
      } else {
        console.error(`Message with ID ${messageUuid} not found.`)
      }
    } catch (error) {
      console.error('Error updating message path:', error.message)
      throw error
    }
  }
}
