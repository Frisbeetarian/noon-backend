import express from 'express'
import MessageController from '../controllers/MessageController'

const messageRouter = express.Router()

messageRouter.get(
  '/:conversationUuid',
  MessageController.getMessagesForConversation
)

messageRouter.post('/uploadFile', MessageController.saveFile)

messageRouter.post(
  '/uploadVoiceRecording',
  MessageController.uploadVoiceRecording
)
messageRouter.post('/groupMessages', MessageController.handleGroupMessage)
messageRouter.post('/', MessageController.handleMessage)

messageRouter.delete('/:messageUuid', MessageController.deleteMessage)

export default messageRouter
