// @ts-nocheck
import { Message } from '../entities/Message'

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
    message: Message
  ) {
    this.io.to(recipientUuid).emit('send-message', {
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
