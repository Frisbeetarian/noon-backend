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
// let test_api = require('./neo4j/routes/router.ts')
// let bodyParser = require('body-parser') //Extract data from Express
import bodyParser from 'body-parser'
import router from './neo4j/routes/router'
import { create_user } from './neo4j/neo4j_calls/neo4j_api'

// const http = require('http')
var socketIo = require('socket.io')

import chat from './socketio/chat'
const app = express()
// const server = http.createServer(app)

// const { Server } = require('socket.io')
// const io = new Server(server)

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

  let server = app.listen(4020, () => {
    // const getApiAndEmit = 'TODO'
    console.log('server start on localhost:4020')
  })

  const io = socketIo(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
  }) // < Interesting!

  chat(io)
  let interval: any

  io.on('connection', (socket) => {
    console.log('New client connected')
    if (interval) {
      clearInterval(interval)
    }

    interval = setInterval(() => getApiAndEmit(socket), 1000)

    socket.on('disconnect', () => {
      console.log('Client disconnected')
      clearInterval(interval)
    })
  })

  const getApiAndEmit = (socket) => {
    const response = new Date()
    // Emitting a new message. Will be consumed by the client
    socket.emit('FromAPI', response)
  }

  // const post = orm.em.create(Post, {title: 'my first post'});
  // console.log('---------------sql 2--------------');
  // await orm.em.persistAndFlush(post);

  // const posts = await orm.em.find(Post, {});
  // console.log(posts);
}

main().catch((err) => {
  console.error(err)
})
