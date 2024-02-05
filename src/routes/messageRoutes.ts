import express from 'express'
import MessageController from '../controllers/MessageController'
import multer from 'multer'

const messageRouter = express.Router()
const upload = multer({ storage: multer.memoryStorage() })

messageRouter.get(
  '/:conversationUuid',
  MessageController.getMessagesForConversation
)

messageRouter.post(
  '/uploadFile',
  upload.single('file'),
  MessageController.saveFile
)

messageRouter.post(
  '/uploadVoiceRecording',
  MessageController.uploadVoiceRecording
)
messageRouter.post('/groupMessages', MessageController.handleGroupMessage)
messageRouter.post('/', MessageController.handleMessage)

messageRouter.delete('/', MessageController.deleteMessage)

export default messageRouter
