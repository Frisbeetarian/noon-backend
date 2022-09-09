import 'reflect-metadata'
import { __prod__ } from './constants'
import express from 'express'
import { ApolloServer } from 'apollo-server-express'
import { buildSchema } from 'type-graphql'
import { HelloResolver } from './resolvers/hello'
import { PostResolver } from './resolvers/post'
import { UserResolver } from './resolvers/user'
import { EventResolver } from './resolvers/events'
import Redis from 'ioredis'
import session from 'express-session'
import connectRedis from 'connect-redis'
import cors from 'cors'
import { createConnection, getConnection } from 'typeorm'
import { User } from './entities/User'
import path from 'path'
import { Updoot } from './entities/Updoot'
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

import bodyParser from 'body-parser'
import router from './neo4j/routes/router'
import * as http from 'http'

const app = express()
// const server = http.createServer(app)
let socketIo = require('socket.io')
const { instrument } = require('@socket.io/admin-ui')
const { setupWorker, setupMaster } = require('@socket.io/sticky')
const crypto = require('crypto')
const randomId = () => crypto.randomBytes(8).toString('hex')
const cluster = require('cluster')

import { RedisSessionStore } from './socketio/sessionStore'
import { SearchResolver } from './resolvers/search'
import { RPCServer } from '@noon/rabbit-mq-rpc/server'
import { Conversation } from './entities/Conversation'
import { Message } from './entities/Message'
import { ConversationResolver } from './resolvers/conversations'
import { ConversationToProfile } from './entities/ConversationToProfile'
import { MessageResolver } from './resolvers/messages'
import { ConversationProfileResolver } from './resolvers/conversationProfile'
import { getFriendsForProfile } from './neo4j/neo4j_calls/neo4j_api'

const main = async () => {
  await createConnection({
    type: 'postgres',
    database: 'reddit2',
    username: 'kozbara',
    password: 'admin',
    logging: true,
    synchronize: true,
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

  // await conn.runMigrations()
  // await Post.delete({})

  // let RedisStore = require('connect-redis')(session);
  const RedisStore = connectRedis(session)
  const redis = new Redis()

  const { RedisSessionStore } = require('./socketio/sessionStore')
  const sessionStore = new RedisSessionStore(redis)

  const { RedisMessageStore } = require('./socketio/messageStore')
  const messageStore = new RedisMessageStore(redis)

  app.use(
    cors({
      origin: 'http://localhost:3000',
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
        sameSite: 'lax', // csrf
        secure: false, // cookie only works in https
      },
      saveUninitialized: false,
      secret: 'fkewblfkewbfliqwjdlnbfewu',
      resave: false,
    })
  )

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
      userLoader: createUserLoader(),
      updootLoader: createUpdootLoader(),
    }),
  })

  apolloServer.applyMiddleware({
    app,
    cors: false,
  })

  app.use(bodyParser.json())
  app.use(bodyParser.urlencoded({ extended: true }))
  app.use('/test_api', router)

  // create_user('lokman')
  // const server = http.createServer(app)
  // let httpServer = http.createServer()
  // const WORKERS_COUNT = 4
  let server = app.listen(4020, () =>
    console.log(`server listening at http://localhost:${4020}`)
  )

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
  //
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
  const io = socketIo(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
    adapter: require('socket.io-redis')({
      pubClient: redis,
      subClient: redis.duplicate(),
    }),
  }) // < Interesting!

  instrument(io, {
    auth: false,
  })

  // io.use(async (socket, next) => {
  //   let sessionID = socket.handshake.auth.sessionID
  //   console.log('socket auth in middleware: ', socket.handshake.auth)
  //   // console.log(
  //   //   'user uuid in middleware: ',
  //   //   socket.handshake.auth.userSocketUuid
  //   // )
  //   // console.log()
  //
  //   // if (sessionID === undefined) {
  //   //   sessionID = socket.sessionID
  //   // }
  //
  //   if (sessionID) {
  //     const session = await sessionStore.findSession(sessionID)
  //
  //     if (session) {
  //       socket.sessionID = sessionID
  //       socket.userID = session.userId
  //       socket.userSocketUuid = session.userSocketUuid
  //       socket.username = session.username
  //       return next()
  //     }
  //   }
  //
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

    if (socket.handshake.auth.userSocketUuid) {
      // persist session
      sessionStore.saveSession(socket.handshake.auth.userSocketUuid, {
        userID: socket.handshake.auth.userSocketUuid,
        username: socket.handshake.auth.username,
        connected: true,
        userSocketUuid: socket.handshake.auth.userSocketUuid,
      })

      // emit session details
      socket.emit('session', {
        sessionID: socket.handshake.auth.userSocketUuid,
        userID: socket.handshake.auth.userID,
      })
    }

    // join the "userID" room
    // console.log('user join room id:', socket.userID)
    socket.join(socket.handshake.auth.userID)

    // fetch existing users
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

    const friends = await getFriendsForProfile(socket.handshake.auth.sessionID)

    // socket.on('friend-connected', async ({}) => {
    friends.map((friend) => {
      io.to(friend.uuid).emit('friend-connected', {
        username: socket.handshake.auth.username,
        uuid: socket.handshake.auth.sessionID,
      })
    })
    // })

    socket.on(
      'private-chat-message',
      async ({
        content,
        from,
        fromUsername,
        to,
        toUsername,
        message,
        conversationUuid,
      }) => {
        const messagePayload = {
          content,
          from: from,
          fromUsername,
          to,
          conversationUuid,
        }

        io.to(to).emit('private-chat-message', {
          content,
          from,
          fromUsername,
          to,
          toUsername,
          message,
          conversationUuid,
        })

        try {
        } catch (e) {
          console.log('ERROR SAVING CONVERSATION:', e)
        }

        messageStore.saveMessage(messagePayload)
      }
    )

    // forward the private message to the right recipient (and to other tabs of the sender)
    socket.on(
      'private message',
      ({ content, from, fromUsername, to, toUsername }) => {
        const message = {
          content,
          from: from,
          fromUsername,
          to,
        }

        io.to(to).emit('private message', {
          content,
          from,
          fromUsername,
          to,
          toUsername,
        })

        messageStore.saveMessage(message)
      }
    )

    socket.on(
      'friendship-request-accepted',
      ({ content, from, fromUsername, to, toUsername }) => {
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

    // notify users upon disconnection
    socket.on('disconnect', async () => {
      const matchingSockets = await io.in(socket.userID).allSockets()
      const isDisconnected = matchingSockets.size === 0

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
