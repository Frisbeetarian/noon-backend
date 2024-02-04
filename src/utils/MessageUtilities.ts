import { getConnection, Repository } from 'typeorm'
import { Message } from '../entities/Message'

export class MessageUtilities {
  static async updateMessagePath(
    messageUuid: string,
    filePath: string,
    type: string
    // conversationUuid: string
  ): Promise<void> {
    try {
      const messageRepository: Repository<Message> =
        getConnection().getRepository(Message)

      const messageToUpdate: Message | undefined =
        await messageRepository.findOne(messageUuid)

      console.log('message path:', filePath)

      if (messageToUpdate) {
        messageToUpdate.src = filePath
        messageToUpdate.type = type
        await messageRepository.save(messageToUpdate)
      } else {
        console.error(`Message with ID ${messageUuid} not found.`)
      }
    } catch (error) {
      console.error('Error updating message path:', error.message)
      throw error
    }
  }
}
