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
    content: String
  ) {
    this.io.to(recipientUuid).emit('accept-friend-request', {
      senderUuid,
      senderUsername,
      recipientUuid,
      recipientUsername,
      content,
    })
  }
}

export default Emitters
