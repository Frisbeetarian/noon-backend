import express from 'express'
import ConversationController from '../controllers/ConversationController'

const conversationRouter = express.Router()

conversationRouter.get(
  '/',
  ConversationController.getConversationsForLoggedInUser
)

conversationRouter.get(
  '/:conversationUuid/checkMessages',
  ConversationController.checkIfConversationHasMoreMessages
)

// router.post(
//   '/conversations/group',
//   ConversationController.createGroupConversation
// )

// router.post('/conversations/leave-group', ConversationController.leaveGroup)
// router.post(
//   '/conversations/set-pending-call',
//   ConversationController.setPendingCallForConversation
// )

// router.post(
//   '/conversations/cancel-pending-call',
//   ConversationController.cancelPendingCallForConversation
// )

// router.post(
//   '/conversations/clear-unread-messages',
//   ConversationController.clearUnreadMessagesForConversation
// )

// router.post(
//   '/conversations/update-unread-messages',
//   ConversationController.updateUnreadMessagesForConversation
// )

// router.get(
//   '/conversations/by-profile',
//   ConversationController.getConversationsByProfileUuid
// )

export default conversationRouter
