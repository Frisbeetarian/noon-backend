import express from 'express'
import MessageController from '../controllers/MessageController'

const messageRouter = express.Router()

messageRouter.get(
  '/:conversationUuid',
  MessageController.getMessagesForConversation
)

messageRouter.post('/uploadImage', MessageController.uploadImage)

messageRouter.post(
  '/uploadVoiceRecording',
  MessageController.uploadVoiceRecording
)

messageRouter.post('/saveGroupMessage', MessageController.saveGroupMessage)

messageRouter.delete('/:messageUuid', MessageController.deleteMessage)

messageRouter.post('/saveMessage', MessageController.saveMessage)

export default messageRouter