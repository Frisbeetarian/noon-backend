// @ts-nocheck
import 'reflect-metadata'
require('dotenv-safe').config({ silent: true })

import express from 'express'
import Redis from 'ioredis'
import session from 'express-session'
import connectRedis from 'connect-redis'
import cors from 'cors'
import { createServer } from 'http'

import { initRPCClient } from './utils/brokerInitializer'
import { __prod__ } from './constants'

import { RedisSessionStore } from './socketio/sessionStore'
import { RedisMessageStore } from './socketio/messageStore'
import config from './config'

import connection from './socketio/connection'
import Emitters from './socketio/emitters'
import { initSocketIO } from './socketio/socket'
import profileRouter from './routes/profileRoutes'
import conversationRouter from './routes/conversationRoutes'
import userRouter from './routes/userRoutes'
import messageRouter from './routes/messageRoutes'
import searchRouter from './routes/searchRoutes'

import {
  globalLimiter,
  registerLimiter,
  loginLimiter,
  messageLimiter,
} from './middleware/rateLimiter'

import { connectToDatabase } from './data-source'

const main = async () => {
  const app = express()
  const httpServer = createServer(app)

  const RedisStore = connectRedis(session)
  const redis = new Redis(config.redis.url)

  const { RedisSessionStore } = require('./socketio/sessionStore')
  const sessionStore = new RedisSessionStore(redis)

  const { RedisMessageStore } = require('./socketio/messageStore')
  const messageStore = new RedisMessageStore(redis)

  app.set('trust proxy', config.app.trustProxy ? 1 : 0)

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
      secret: config.session.secret,
      resave: false,
    })
  )

  app.use(
    cors({
      origin: config.cors.origins,
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

  connection(io, sessionStore, messageStore)

  await connectToDatabase()

  app.use('/api/users', userRouter)
  app.use('/api/profiles', profileRouter)
  app.use('/api/conversations', conversationRouter)
  app.use('/api/messages', messageRouter)
  app.use('/api/search', searchRouter)

  httpServer.listen(config.app.port, () =>
    console.log(`server listening at http://localhost:${config.app.port}`)
  )
}

main().catch((err) => {
  console.error(err)
})
