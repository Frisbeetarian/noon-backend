// @ts-nocheck
import 'reflect-metadata'
const dotenv = require('dotenv-safe').config({ silent: true })

import express from 'express'
import Redis from 'ioredis'
import session from 'express-session'
import connectRedis from 'connect-redis'
import cors from 'cors'
import { createConnection } from 'typeorm'
import path from 'path'
const { instrument } = require('@socket.io/admin-ui')
import { createServer } from 'http'

import { Profile } from './entities/Profile'
import { Friend } from './entities/Friend'

import { RPCServer } from '@noon/rabbit-mq-rpc'

import { RedisSessionStore } from './socketio/sessionStore'
import { Conversation } from './entities/Conversation'
import { Message } from './entities/Message'

import { ConversationToProfile } from './entities/ConversationToProfile'
import { initRPCClient } from './utils/brokerInitializer'
import { __prod__ } from './constants'

import { User } from './entities/User'
import { RedisMessageStore } from './socketio/messageStore'

import connection from './socketio/connection'
import Emitters from './socketio/emitters'
import { initSocketIO } from './socketio/socket'
import profileRouter from './routes/profileRoutes'
import conversationRouter from './routes/conversationRoutes'
import userRouter from './routes/userRoutes'
import messageRouter from './routes/messageRoutes'
import searchRouter from './routes/searchRoutes'
import { MessageUtilities } from './utils/MessageUtilities'

import {
  globalLimiter,
  registerLimiter,
  loginLimiter,
  messageLimiter,
} from './middleware/rateLimiter'
import { EncryptedKey } from './entities/EncryptedKey'

const main = async () => {
  const app = express()
  const httpServer = createServer(app)

  const RedisStore = connectRedis(session)
  const redis = new Redis(process.env.REDIS_URL)

  const { RedisSessionStore } = require('./socketio/sessionStore')
  const sessionStore = new RedisSessionStore(redis)

  const { RedisMessageStore } = require('./socketio/messageStore')
  const messageStore = new RedisMessageStore(redis)

  app.set('trust proxy', 1)

  console.log('process.env.CORS_ORIGIN:', process.env.CORS_ORIGIN)
  console.log('prod:', __prod__)

  app.use(
    session({
      name: 'qid',
      store: new RedisStore({
        client: redis,
        disableTouch: true,
      }),
      proxy: __prod__,
      cookie: {
        domain: __prod__ ? '.noon.tube' : undefined,
        maxAge: 12 * 60 * 60 * 1000,
        httpOnly: true,
        sameSite: __prod__ ? 'None' : 'Lax',
        secure: __prod__,
      },
      saveUninitialized: false,
      secret: process.env.SESSION_SECRET,
      resave: false,
    })
  )

  app.use(
    cors({
      origin: process.env.CORS_ORIGIN,
      credentials: true,
    })
  )

  app.use(express.json())
  app.use(express.urlencoded({ extended: true }))

  app.use(globalLimiter)
  app.use('/api/users/register', registerLimiter)
  app.use('/api/users/login', loginLimiter)
  app.use('/api/messages/handleMessage', messageLimiter)
  app.use('/api/messages/handleGroupMessage', messageLimiter)

  const io = initSocketIO(httpServer, redis)

  console.log(`Worker ${process.pid} started`)

  instrument(io, {
    auth: {
      type: 'basic',
      username: process.env.SOCKET_INSTRUMENT_USERNAME,
      password: process.env.SOCKET_INSTRUMENT_PASSWORD,
    },
  })

  connection(io, sessionStore, messageStore)

  let retries = 5
  while (retries) {
    try {
      await createConnection({
        host: process.env.POSTGRESQL_HOST,
        type: 'postgres',
        database: process.env.POSTGRESQL_DATABASE,
        username: process.env.POSTGRESQL_USERNAME,
        password: process.env.POSTGRESQL_PASSWORD,
        logging: true,
        synchronize: true,
        migrations: [path.join(__dirname, './migrations/*')],
        entities: [
          User,
          Profile,
          Friend,
          Conversation,
          Message,
          ConversationToProfile,
          EncryptedKey,
        ],
        subscribers: [path.join(__dirname, './subscribers/*')],
      })
      break
    } catch (e) {
      retries -= 1
      console.log('error connecting to postgres db:', e, retries)
      new Promise((res) => setTimeout(res, 5000))
    }
  }

  // await conn.runMigrations()

  app.use('/api/users', userRouter)
  app.use('/api/profiles', profileRouter)
  app.use('/api/conversations', conversationRouter)
  app.use('/api/messages', messageRouter)
  app.use('/api/search', searchRouter)

  httpServer.listen(parseInt(process.env.PORT), () =>
    console.log(`server listening at http://localhost:${process.env.PORT}`)
  )

  const connectionObject = {
    protocol: 'amqp',
    hostname: 'localhost',
    port: 5672,
    username: process.env.RABBIT_MQ_USERNAME,
    password: process.env.RABBIT_MQ_PASSWORD,
    locale: 'en_US',
    vhost: '/',
  }

  const initializeRPCServer = (emitters) => {
    try {
      const searchRpcServer = new RPCServer({
        connectionObject,
        hostId: 'localhost',
        queue: 'rpc_queue.noon.search-results',
        handleMessage: (index, params) => {
          console.log('RPC_SEARCH_RECEIVED', { index, params })
          const { profiles, senderUuid } = params
          emitters.emitSearchResultSet(senderUuid, profiles)
        },
      })

      searchRpcServer
        .start()
        .then(() => {
          console.log('RPC_CONNECTION_SUCCESSFUL for search results', {
            hostId: 'localhost',
            queue: 'rpc_queue.noon.search-results',
          })
        })
        .catch((e) => {
          console.error(
            'RPC_CONNECTION_FAILED for search results',
            JSON.stringify(e)
          )
        })

      const mediaRpcServer = new RPCServer({
        connectionObject,
        hostId: 'localhost',
        queue: 'rpc_queue.noon.media-results',
        handleMessage: async (index, params) => {
          console.log('RPC_MEDIA_RECEIVED', { index, params })
          const {
            filePath,
            type,
            messageUuid,
            conversationUuid,
            conversationType,
            senderProfileUuid,
            senderProfileUsername,
            participantUuids,
          } = params
          await MessageUtilities.updateMessagePath(
            messageUuid,
            filePath,
            type,
            conversationUuid,
            conversationType,
            senderProfileUuid,
            senderProfileUsername,
            participantUuids
          )
        },
      })

      mediaRpcServer
        .start()
        .then(() => {
          console.log('RPC_CONNECTION_SUCCESSFUL for media results', {
            hostId: 'localhost',
            queue: 'rpc_queue.noon.media-results',
          })
        })
        .catch((e) => {
          console.error(
            'RPC_CONNECTION_FAILED for media results',
            JSON.stringify(e)
          )
        })
    } catch (e) {
      console.log('RPC Server initialization failed', JSON.stringify(e))

      setTimeout(() => {
        console.error(e)
        process.exit(1)
      }, 2000)
    }
  }

  const emitters = new Emitters(io)
  initializeRPCServer(emitters)

  async function establishRPCConnections() {
    await initRPCClient()
  }

  establishRPCConnections()
}

main().catch((err) => {
  console.error(err)
})
