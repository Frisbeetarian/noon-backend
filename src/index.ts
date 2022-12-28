// @ts-ignore
import 'reflect-metadata'
// import 'dotenv-safe/config'

// const dotenv = require('dotenv')
const dotenv = require('dotenv-safe').config({ silent: true })

import express from 'express'
import { ApolloServer } from 'apollo-server-express'
import { buildSchema } from 'type-graphql'
import Redis from 'ioredis'
import session from 'express-session'
import connectRedis from 'connect-redis'
import cors from 'cors'
import { createConnection } from 'typeorm'
import path from 'path'
let socketIo = require('socket.io')
const { instrument } = require('@socket.io/admin-ui')

import { createUserLoader } from './utils/createUserLoader'
import { createUpdootLoader } from './utils/createUpdootLoader'
import { Post } from './entities/Post'
import { Profile } from './entities/Profile'
import { Friend } from './entities/Friend'
import { Event } from './entities/Event'
import { ProfileResolver } from './resolvers/profiles'
import { EventToProfile } from './entities/EventToProfile'
import { EventToProfileResolver } from './resolvers/eventToProfile'
import { Community } from './entities/Community'
import { CommunityResolver } from './resolvers/communities'
import { CommunityParticipant } from './entities/CommunityParticipant'
import { CommunityParticipantsResolver } from './resolvers/communityParticipants'
import { RPCServer } from '@noon/rabbit-mq-rpc/server'
import { RedisSessionStore } from './socketio/sessionStore'
import { SearchResolver } from './resolvers/search'
import { Conversation } from './entities/Conversation'
import { Message } from './entities/Message'
import { ConversationResolver } from './resolvers/conversations'
import { ConversationToProfile } from './entities/ConversationToProfile'
import { MessageResolver } from './resolvers/messages'
import { ConversationProfileResolver } from './resolvers/conversationProfile'
import { getFriendsForProfile } from './neo4j/neo4j_calls/neo4j_api'
import { createMessageLoader } from './utils/createMessageLoader'
import { __prod__ } from './constants'
import { PostResolver } from './resolvers/post'
import { UserResolver } from './resolvers/user'
import { EventResolver } from './resolvers/events'
import { User } from './entities/User'
import { Updoot } from './entities/Updoot'
import mediaRouter from './media/router'

const app = express()

const main = async () => {
  let retries = 5

  while (retries) {
    try {
      await createConnection({
        type: 'postgres',
        database: process.env.POSTGRESQL_DATABASE,
        username: process.env.POSTGRESQL_USERNAME,
        password: process.env.POSTGRESQL_PASSWORD,
        // url: process.env.POSTGRESQL_URL,
        logging: true,
        synchronize: !__prod__,
        migrations: [path.join(__dirname, './migrations/*')],
        entities: [
          User,
          Post,
          Updoot,
          Profile,
          Friend,
          Event,
          EventToProfile,
          Community,
          CommunityParticipant,
          Conversation,
          Message,
          ConversationToProfile,
        ],
        subscribers: [path.join(__dirname, './subscribers/*')],
      })
      break
    } catch (e) {
      retries -= 1
      console.log('error connecting to postgres db:', e, retries)
      await new Promise((res) => setTimeout(res, 5000))
    }
  }
  // await conn.runMigrations()
  const RedisStore = connectRedis(session)
  const redis = new Redis(process.env.REDIS_URL)

  const { RedisSessionStore } = require('./socketio/sessionStore')
  const sessionStore = new RedisSessionStore(redis)

  const { RedisMessageStore } = require('./socketio/messageStore')
  const messageStore = new RedisMessageStore(redis)
  console.log('is prod:', __prod__)
  if (__prod__) {
    app.set('trust proxy', 1)
  }

  app.use(
    cors({
      origin: process.env.CORS_ORIGIN,
      credentials: true,
    })
  )

  app.use(
    session({
      name: 'qid',
      store: new RedisStore({
        client: redis,
        disableTouch: true,
      }),
      cookie: {
        maxAge: 1000 * 60 * 60 * 24 * 365 * 10, // 10 years
        httpOnly: true,
        sameSite: 'lax',
        secure: __prod__,
        domain: __prod__ ? '.noon.tube' : undefined,
      },
      saveUninitialized: false,
      secret: process.env.SESSION_SECRET,
      resave: false,
    })
  )

  let server = app.listen(parseInt(process.env.PORT), () =>
    console.log(`server listening at http://localhost:${process.env.PORT}`)
  )

  const io = socketIo(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
    adapter: require('socket.io-redis')({
      pubClient: redis,
      subClient: redis.duplicate(),
    }),
  })

  const apolloServer = new ApolloServer({
    schema: await buildSchema({
      resolvers: [
        PostResolver,
        UserResolver,
        EventResolver,
        CommunityResolver,
        ProfileResolver,
        EventToProfileResolver,
        CommunityParticipantsResolver,
        SearchResolver,
        ConversationResolver,
        ConversationProfileResolver,
        MessageResolver,
      ],
      validate: false,
    }),
    context: ({ req, res }) => ({
      req,
      res,
      redis,
      io,
      userLoader: createUserLoader(),
      updootLoader: createUpdootLoader(),
      messageLoader: createMessageLoader(),
    }),
    uploads: false,
  })

  // app.use(graphqlUploadExpress())
  // app.use(graphqlUploadExpress({ maxFileSize: 10000000000, maxFiles: 10 }))

  apolloServer.applyMiddleware({
    app,
    cors: false,
  })

  app.use(express.json())
  app.use(express.urlencoded({ extended: true }))

  app.use('/media_api', mediaRouter)

  // create_user('lokman')
  // const server = http.createServer(app)
  // let httpServer = http.createServer()
  // const WORKERS_COUNT = 4

  // if (cluster.isMaster) {
  //   console.log(`Master ${process.pid} is running`)
  //
  //   for (let i = 0; i < WORKERS_COUNT; i++) {
  //     cluster.fork()
  //   }
  //
  //   cluster.on('exit', (worker) => {
  //     console.log(`Worker ${worker.process.pid} died`)
  //     cluster.fork()
  //   })
  //   // const httpServer = http.createServer()

  //   setupMaster(httpServer, {
  //     loadBalancingMethod: 'least-connection', // either "random", "round-robin" or "least-connection"
  //   })
  //
  //   app.listen(4020, () =>
  //     console.log(`server listening at http://localhost:${4020}`)
  //   )
  // } else {
  console.log(`Worker ${process.pid} started`)
  // app.listen(4020, () => {
  //   console.log('server start on localhost:4020')
  // })

  instrument(io, {
    auth: {
      type: 'basic',
      username: process.env.SOCKET_INSTRUMENT_USERNAME,
      password: process.env.SOCKET_INSTRUMENT_PASSWORD,
    },
  })

  // io.use(async (socket, next) => {
  //   let sessionID = socket.handshake.auth.sessionID
  //   console.log('socket auth in middleware: ', socket.handshake.auth)
  //   // console.log(
  //   //   'user uuid in middleware: ',
  //   //   socket.handshake.auth.userSocketUuid
  //   // )
  //   // console.log()

  //   // if (sessionID === undefined) {
  //   //   sessionID = socket.sessionID
  //   // }

  //   if (sessionID) {
  //     const session = await sessionStore.findSession(sessionID)

  //     if (session) {
  //       socket.sessionID = sessionID
  //       socket.userID = session.userId
  //       socket.userSocketUuid = session.userSocketUuid
  //       socket.username = session.username
  //       return next()
  //     }
  //   }

  //   const username = socket.handshake.auth.username
  //
  //   if (!username) {
  //     return next(new Error('invalid username'))
  //   }
  //   console.log('middleware not passing through session')
  //   socket.sessionID = randomId()
  //   socket.userID = socket.handshake.auth.userID
  //   socket.username = username
  //   socket.userSocketUuid = socket.handshake.auth.userSocketUuid
  //   next()
  // })

  // chat(io)
  // setupWorker(io)

  io.on('connection', async (socket) => {
    console.log(
      'socket.handshake.auth.sessionID:',
      socket.handshake.auth.sessionID
    )

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

      // socket.emit('users', users)

      // notify existing users
      // socket.broadcast.emit('user connected', {
      //   userID: socket.userID,
      //   username: socket.username,
      //   connected: true,
      //   messages: [],
      // })

      const friends = await getFriendsForProfile(
        socket.handshake.auth.sessionID
      )

      // socket.on('friend-connected', async ({}) => {
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

      // from: loggedInUser.user?.profile?.uuid,
      //   fromUsername:
      // loggedInUser.user?.profile?.username,
      //   conversationUuid: conversation.uuid,
      //   participants: participantsToSend,

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

      // forward the private message to the right recipient (and to other tabs of the sender)
      socket.on(
        'send-friend-request',
        ({ content, from, fromUsername, to, toUsername }) => {
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

  const { RPCServer } = require('@noon/rabbit-mq-rpc/server')

  const connectionObject = {
    protocol: 'amqp',
    hostname: 'localhost',
    port: 5672,
    username: 'guest',
    password: 'guest',
    locale: 'en_US',
    vhost: '/',
  }

  async function establishRPCConsumer() {
    try {
      const rpcServer = new RPCServer({
        connectionObject,
        hostId: 'localhost',
        queue: 'rpc_queue.noon.search-results',
      })

      await rpcServer.start()

      console.log('RPC_CONNECTION_SUCCESSFUL', {
        hostId: 'localhost',
        queue: 'rpc_queue.noon.search-results',
      })
    } catch (e) {
      console.log('RPC_CONNECTION_FAILED', JSON.stringify(e))

      setTimeout(() => {
        console.error(e)
        process.exit(1)
      }, 2000)
    }
  }

  establishRPCConsumer()
}

main().catch((err) => {
  console.error(err)
})
