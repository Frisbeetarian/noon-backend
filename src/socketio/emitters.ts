// @ts-nocheck
import { Message } from '../models/Message'

class Emitters {
  private io: any
  constructor(io: any) {
    this.io = io
  }

  emitSearchResultSet(senderUuid: String, profiles: any) {
    this.io.to(senderUuid).emit('search-results', profiles)
  }

  emitFriendRequest(
    senderUuid: String,
    senderUsername: String,
    recipientUuid: String,
    recipientUsername: String,
    content: String
  ) {
    this.io.to(recipientUuid).emit('send-friend-request', {
      senderUuid,
      senderUsername,
      recipientUuid,
      recipientUsername,
      content,
    })
  }

  emitCancelFriendRequest(
    senderUuid: String,
    senderUsername: String,
    recipientUuid: String,
    recipientUsername: String,
    content: String
  ) {
    this.io.to(recipientUuid).emit('cancel-friend-request', {
      senderUuid,
      senderUsername,
      recipientUuid,
      recipientUsername,
      content,
    })
  }

  acceptFriendRequest(
    senderUuid: String,
    senderUsername: String,
    recipientUuid: String,
    recipientUsername: String,
    content: String,
    conversation
  ) {
    this.io.to(recipientUuid).emit('friendship-request-accepted', {
      senderUuid,
      senderUsername,
      recipientUuid,
      recipientUsername,
      content,
      conversation,
    })
  }

  unfriend(
    senderUuid: String,
    senderUsername: String,
    recipientUuid: String,
    recipientUsername: String,
    content: String,
    conversationUuid
  ) {
    this.io.to(recipientUuid).emit('unfriend', {
      senderUuid,
      senderUsername,
      recipientUuid,
      recipientUsername,
      content,
      conversationUuid,
    })
  }

  emitSendMessage(
    senderUuid: String,
    senderUsername: String,
    recipientUuid: String,
    recipientUsername: String,
    conversationUuid: String,
    content: String,
    message: Message,
    encryptedKey: String
  ) {
    this.io.to(recipientUuid).emit('send-message', {
      senderUuid,
      senderUsername,
      recipientUuid,
      recipientUsername,
      conversationUuid,
      content,
      message,
      encryptedKey,
    })
  }

  emitSendFile(
    senderProfileUuid: String,
    senderProfileUsername: String,
    recipientUuid: String,
    conversationUuid: String,
    conversationType: String,
    messageUuid: String,
    messageType: String,
    filePath: String
  ) {
    this.io.to(recipientUuid).emit('send-file', {
      senderProfileUuid,
      senderProfileUsername,
      recipientUuid,
      conversationUuid,
      conversationType,
      messageUuid,
      messageType,
      filePath,
    })
  }

  emitMessageDeleted(
    senderUuid: String,
    senderUsername: String,
    recipientUuid: String,
    recipientUsername: String,
    conversationUuid: String,
    messageUuid: String,
    content: String
  ) {
    this.io.to(recipientUuid).emit('message-deleted', {
      senderUuid,
      senderUsername,
      recipientUuid,
      recipientUsername,
      conversationUuid,
      messageUuid,
      content,
    })
  }

  emitAddedToGroup(
    senderUuid: String,
    senderUsername: String,
    recipientUuid: String,
    recipientUsername: String,
    conversationUuid: String,
    content: String,
    conversation: Message
  ) {
    this.io.to(recipientUuid).emit('added-to-group', {
      senderUuid,
      senderUsername,
      recipientUuid,
      recipientUsername,
      conversationUuid,
      content,
      conversation,
    })
  }

  emitSendMessageToGroup(
    senderUuid: String,
    senderUsername: String,
    recipientUuid: String,
    recipientUsername: String,
    conversationUuid: String,
    content: String,
    message: Message
  ) {
    this.io.to(recipientUuid).emit('send-message-to-group', {
      senderUuid,
      senderUsername,
      recipientUuid,
      recipientUsername,
      conversationUuid,
      content,
      message,
    })
  }
}

export default Emitters
