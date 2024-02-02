// @ts-nocheck
import { getFriendsForProfile } from '../neo4j/neo4j_calls/neo4j_api'

const emitSearchResultSet = (io, senderUuid, profile) => {
  console.log('emitSearchResultSet:', { senderUuid, profile })
  io.to(senderUuid).emit('search-results', { profile })
}

const connection = (io, sessionStore, messageStore) => {
  io.on('connection', async (socket) => {
    console.log('socket.handshake.sessionID:', socket.handshake.sessionID)

    console.log(
      'socket.handshake.auth.userSocketUuid:',
      socket.handshake.auth.userSocketUuid
    )

    if (socket.handshake.auth.userSocketUuid) {
      sessionStore.saveSession(socket.handshake.auth.userSocketUuid, {
        userID: socket.handshake.auth.userSocketUuid,
        username: socket.handshake.auth.username,
        connected: true,
        userSocketUuid: socket.handshake.auth.userSocketUuid,
      })

      socket.emit('session', {
        sessionID: socket.handshake.auth.userSocketUuid,
        userID: socket.handshake.auth.userID,
      })

      socket.join(socket.handshake.auth.userID)
      const users = []
      const [messages, sessions] = await Promise.all([
        messageStore.findMessagesForUser(socket.userID),
        sessionStore.findAllSessions(),
      ])

      const messagesPerUser = new Map()

      messages.forEach((message) => {
        const { from, to } = message
        const otherUser = socket.userID === from ? to : from

        if (messagesPerUser.has(otherUser)) {
          messagesPerUser.get(otherUser).push(message)
        } else {
          messagesPerUser.set(otherUser, [message])
        }
      })

      sessions.forEach((session) => {
        users.push({
          userID: session.userID,
          username: session.username,
          connected: session.connected,
          messages: messagesPerUser.get(session.userID) || [],
        })
      })

      const friends = await getFriendsForProfile(
        socket.handshake.auth.sessionID
      )

      friends.map((friend) => {
        io.to(friend.uuid).emit('friend-connected', {
          username: socket.handshake.auth.username,
          uuid: socket.handshake.auth.sessionID,
        })
      })

      socket.on(
        'group-created',
        async ({
          fromUuid,
          fromUsername,
          conversation,
          groupUuid,
          participants,
        }) => {
          participants.map((participant) => {
            // figure out way to send messages to groups
            if (participant !== fromUuid) {
              io.to(participant).emit('invited-to-group', {
                fromUuid,
                fromUsername,
                conversation,
                groupUuid,
                participants,
              })
            }
          })
        }
      )

      socket.on(
        'left-group',
        async ({ fromUuid, fromUsername, conversationUuid, participants }) => {
          participants.map((participant) => {
            // TODO figure out way to send messages to groups
            io.to(participant).emit('left-group', {
              fromUuid,
              fromUsername,
              conversationUuid,
            })
          })
        }
      )

      socket.on(
        'private-chat-message',
        async ({
          content,
          from,
          fromUsername,
          to,
          toUsername,
          messageUuid,
          message,
          conversationUuid,
          type,
          src,
        }) => {
          const messagePayload = {
            content,
            from: from,
            fromUsername,
            to,
            conversationUuid,
            type,
            src,
          }

          io.to(to).emit('private-chat-message', {
            content,
            from,
            fromUsername,
            to,
            toUsername,
            messageUuid,
            message,
            conversationUuid,
            type,
            src,
          })

          try {
            messageStore.saveMessage(messagePayload)
          } catch (e) {
            console.log('ERROR SAVING CONVERSATION:', e)
          }
        }
      )

      socket.on(
        'message-deleted',
        ({
          messageUuid,
          to,
          toUsername,
          from,
          fromUsername,
          conversationUuid,
        }) => {
          io.to(to).emit('message-deleted', {
            messageUuid,
            to,
            toUsername,
            from,
            fromUsername,
            conversationUuid,
          })
        }
      )

      socket.onAny((event, ...args) => {
        console.log(event, args)
      })

      // forward the private message to the right recipient (and to other tabs of the sender)
      socket.on(
        'send-friend-request',
        ({ content, from, fromUsername, to, toUsername }) => {
          console.log('send-friend-request: ', {
            content,
            from,
            fromUsername,
            to,
            toUsername,
          })

          io.to(to).emit('send-friend-request', {
            content,
            from,
            fromUsername,
            to,
            toUsername,
          })
        }
      )

      socket.on(
        'cancel-friend-request',
        ({ content, from, fromUsername, to, toUsername }) => {
          io.to(to).emit('cancel-friend-request', {
            content,
            from,
            fromUsername,
            to,
            toUsername,
          })
        }
      )

      socket.on(
        'unfriend',
        ({ content, from, fromUsername, to, toUsername, conversationUuid }) => {
          io.to(to).emit('unfriend', {
            content,
            from,
            fromUsername,
            to,
            toUsername,
            conversationUuid,
          })
        }
      )

      socket.on(
        'friendship-request-accepted',
        ({ content, from, fromUsername, to, toUsername, conversation }) => {
          const message = {
            content,
            from: from,
            fromUsername,
            to,
          }

          io.to(to).emit('friendship-request-accepted', {
            content,
            from,
            fromUsername,
            to,
            toUsername,
            conversation,
          })

          messageStore.saveMessage(message)
        }
      )

      socket.on(
        'check-friend-connection',
        async ({ from, fromUsername, to, toUsername }) => {
          const session = await sessionStore.findSession(to)
          console.log('session DATA:', session)

          io.to(from).emit('check-friend-connection', {
            session: session,
          })
        }
      )

      socket.on(
        'set-pending-call-for-conversation',
        async ({ from, fromUsername, to, toUsername, conversationUuid }) => {
          io.to(to).emit('set-pending-call-for-conversation', {
            from,
            fromUsername,
            to,
            toUsername,
            conversationUuid,
          })
        }
      )

      socket.on(
        'cancel-pending-call-for-conversation',
        async ({ from, fromUsername, to, toUsername, conversationUuid }) => {
          console.log('cancel pending call for conversation:', to)

          io.to(to).emit('cancel-pending-call-for-conversation', {
            from,
            fromUsername,
            to,
            toUsername,
            conversationUuid,
          })
        }
      )

      socket.on(
        'set-ongoing-call-for-conversation',
        async ({ from, fromUsername, to, toUsername, conversationUuid }) => {
          // const session = await sessionStore.findSession(to)
          // console.log('session DATA:', session)

          io.to(to).emit('set-ongoing-call-for-conversation', {
            from,
            fromUsername,
            to,
            toUsername,
            conversationUuid,
          })
        }
      )

      socket.on(
        'cancel-ongoing-call-for-conversation',
        async ({ from, fromUsername, to, toUsername, conversationUuid }) => {
          // const session = await sessionStore.findSession(to)

          io.to(to).emit('set-ongoing-call-for-conversation', {
            from,
            fromUsername,
            to,
            toUsername,
            conversationUuid,
          })
        }
      )

      // notify users upon disconnection
      socket.on('disconnect', async () => {
        const matchingSockets = await io.in(socket.userID).allSockets()
        const isDisconnected = matchingSockets.size === 0
        console.log('username on disconnect:', socket.handshake.auth.username)
        if (isDisconnected) {
          // notify other users
          socket.broadcast.emit('user disconnected', socket.userID)

          // update the connection status of the session
          sessionStore.saveSession(socket.handshake.auth.userSocketUuid, {
            userID: socket.handshake.auth.userSocketUuid,
            username: socket.handshake.auth.userID,
            connected: false,
            userSocketUuid: socket.handshake.auth.userSocketUuid,
          })

          console.log(
            'socket.handshake.auth.userSocketUuid on disconnect:',
            socket.handshake.auth.sessionID
          )

          const friends = await getFriendsForProfile(
            socket.handshake.auth.sessionID
          )

          friends.map((friend) => {
            io.to(friend.uuid).emit('friend-disconnected', {
              username: socket.handshake.auth.username,
              uuid: socket.handshake.auth.sessionID,
            })
          })

          console.log('friends on disconnect:', friends)
        }
      })
    }
  })
}

export default connection
