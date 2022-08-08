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
import { createConnection } from 'typeorm'
import { User } from './entities/User'
import path from 'path'
import { Updoot } from './entities/Updoot'
import { createUserLoader } from './utils/createUserLoader'
import { createUpdootLoader } from './utils/createUpdootLoader'

import { Post } from './entities/Post'
import { Profile } from './entities/Profile'
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

import chat from './socketio/chat'
import { RedisSessionStore } from './socketio/sessionStore'
import { RedisMessageStore } from './socketio/messageStore'

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
      Event,
      EventToProfile,
      Community,
      CommunityParticipant,
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
    console.log(`servser listening at http://localhost:${4020}`)
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

  io.use(async (socket, next) => {
    const sessionID = socket.handshake.auth.sessionID
    console.log('session id in middleware: ', sessionID)
    if (sessionID) {
      const session = await sessionStore.findSession(sessionID)
      if (session) {
        socket.sessionID = sessionID
        socket.userID = session.userID
        socket.username = session.username
        return next()
      }
    }
    const username = socket.handshake.auth.username
    // console.log('username id in the name: ', username)

    if (!username) {
      return next(new Error('invalid username'))
    }
    socket.sessionID = randomId()
    socket.userID = randomId()
    socket.username = username
    next()
  })

  // chat(io)
  // setupWorker(io)

  io.on('connection', async (socket) => {
    console.log('connected to socket server in connection:', socket.sessionID)
    // persist session
    sessionStore.saveSession(socket.sessionID, {
      userID: socket.userID,
      username: socket.username,
      connected: true,
    })

    // emit session details
    socket.emit('session', {
      sessionID: socket.sessionID,
      userID: socket.userID,
    })

    // join the "userID" room
    console.log('user join room id:', socket.userID)
    socket.join(socket.userID)

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
    socket.emit('users', users)

    // notify existing users
    socket.broadcast.emit('user connected', {
      userID: socket.userID,
      username: socket.username,
      connected: true,
      messages: [],
    })

    // forward the private message to the right recipient (and to other tabs of the sender)
    socket.on('privatemessage', ({ content, to, toUsername }) => {
      console.log('private message user id:', to)
      const message = {
        content,
        from: socket.userID,
        to,
      }

      io.to('3547f65075150edd').emit('privatemessage', { content })

      console.log('message isn friend request:', toUsername)

      messageStore.saveMessage(message)
    })

    // notify users upon disconnection
    socket.on('disconnect', async () => {
      const matchingSockets = await io.in(socket.userID).allSockets()
      const isDisconnected = matchingSockets.size === 0
      if (isDisconnected) {
        // notify other users
        socket.broadcast.emit('user disconnected', socket.userID)
        // update the connection status of the session
        sessionStore.saveSession(socket.sessionID, {
          userID: socket.userID,
          username: socket.username,
          connected: false,
        })
      }
    })
  })
  // }
}

main().catch((err) => {
  console.error(err)
})
