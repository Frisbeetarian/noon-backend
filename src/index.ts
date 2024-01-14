// @ts-nocheck
import 'reflect-metadata'
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
import { ProfileResolver } from './resolvers/profiles'
import { RPCServer } from '@noon/rabbit-mq-rpc/server'
import { RedisSessionStore } from './socketio/sessionStore'
import { SearchResolver } from './resolvers/search'
import { Conversation } from './entities/Conversation'
import { Message } from './entities/Message'
import { ConversationResolver } from './resolvers/conversations'
import { ConversationToProfile } from './entities/ConversationToProfile'
import { MessageResolver } from './resolvers/messages'
import { ConversationProfileResolver } from './resolvers/conversationProfile'
import { createMessageLoader } from './utils/createMessageLoader'
import { __prod__ } from './constants'
import { PostResolver } from './resolvers/post'
import { UserResolver } from './resolvers/user'
import { User } from './entities/User'
import { Updoot } from './entities/Updoot'
import { RedisMessageStore } from './socketio/messageStore'
import connection from './socketio/connection'
import { graphqlUploadExpress } from 'graphql-upload-minimal'

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
        logging: true,
        synchronize: !__prod__,
        migrations: [path.join(__dirname, './migrations/*')],
        entities: [
          User,
          Post,
          Updoot,
          Profile,
          Friend,
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

  app.set('trust proxy', 1)

  const RedisStore = connectRedis(session)
  const redis = new Redis(process.env.REDIS_URL)

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
        maxAge: 3 * 60 * 60 * 1000, // 3 hours
        httpOnly: true,
        sameSite: 'lax',
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

  app.use(
    graphqlUploadExpress({
      maxFileSize: 10000000, // 10 MB
      maxFiles: 20,
    })
  )

  const apolloServer = new ApolloServer({
    schema: await buildSchema({
      resolvers: [
        PostResolver,
        UserResolver,
        ProfileResolver,
        SearchResolver,
        ConversationResolver,
        ConversationProfileResolver,
        MessageResolver,
      ],
      validate: false,
    }),
    typeDefs: require('./typeDefs'),
    context: ({ req, res }) => ({
      req,
      res,
      redis,
      // io,
      userLoader: createUserLoader(),
      updootLoader: createUpdootLoader(),
      messageLoader: createMessageLoader(),
    }),
    // uploads: false,
  })

  let server = null

  apolloServer.start().then((res) => {
    apolloServer.applyMiddleware({
      app,
      cors: false,
    })

    server = app.listen(parseInt(process.env.PORT), () =>
      console.log(`server listening at http://localhost:${process.env.PORT}`)
    )

    try {
      const io = socketIo(server, {
        cors: {
          origin: process.env.CORS_ORIGIN,
          methods: ['GET', 'POST'],
        },
        adapter: require('socket.io-redis')({
          pubClient: redis,
          subClient: redis.duplicate(),
        }),
      })

      console.log(`Worker ${process.pid} started`)

      instrument(io, {
        auth: {
          type: 'basic',
          username: process.env.SOCKET_INSTRUMENT_USERNAME,
          password: process.env.SOCKET_INSTRUMENT_PASSWORD,
        },
      })

      connection(io, sessionStore, messageStore)
    } catch (e) {
      console.log('error establishing websocket connection:', e)
    }
  })

  app.use(express.json())
  app.use(express.urlencoded({ extended: true }))

  const { RedisSessionStore } = require('./socketio/sessionStore')
  const sessionStore = new RedisSessionStore(redis)

  const { RedisMessageStore } = require('./socketio/messageStore')
  const messageStore = new RedisMessageStore(redis)

  const { RPCServer } = require('@noon/rabbit-mq-rpc/server')

  const connectionObject = {
    protocol: 'amqp',
    hostname: 'localhost',
    port: 5672,
    username: process.env.RABBIT_MQ_USERNAME,
    password: process.env.RABBIT_MQ_PASSWORD,
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
