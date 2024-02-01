import express from 'express'
import ConversationController from '../controllers/ConversationController'

const conversationRouter = express.Router()

conversationRouter.get(
  '/',
  ConversationController.getConversationsForLoggedInUser
)

conversationRouter.post('/', ConversationController.createGroupConversation)

conversationRouter.post('/leaveGroup', ConversationController.leaveGroup)

// conversationRouter.post(
//   '/conversations/set-pending-call',
//   ConversationController.setPendingCallForConversation
// )

// conversationRouter.post(
//   '/conversations/cancel-pending-call',
//   ConversationController.cancelPendingCallForConversation
// )

conversationRouter.get(
  '/:conversationUuid/checkMessages',
  ConversationController.checkIfConversationHasMoreMessages
)

conversationRouter.post(
  '/conversations/clear-unread-messages',
  ConversationController.clearUnreadMessagesForConversation
)

conversationRouter.post(
  '/conversations/update-unread-messages',
  ConversationController.updateUnreadMessagesForConversation
)

export default conversationRouter
