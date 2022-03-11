import 'reflect-metadata'
import { __prod__ } from './constants'
import express from 'express'
import { ApolloServer } from 'apollo-server-express'
import { buildSchema } from 'type-graphql'
import { HelloResolver } from './resolvers/hello'
import { PostResolver } from './resolvers/post'
import { UserResolver } from './resolvers/user'
import Redis from 'ioredis'
import session from 'express-session'
import connectRedis from 'connect-redis'
import cors from 'cors'
// import { sendEmail } from './utils/sendEmail'
// import { User } from './entities/User'
import { createConnection } from 'typeorm'
import { User } from './entities/User'
// import { Post } from './entities/Post'
import path from 'path'
import { Updoot } from './entities/Updoot'
import { createUserLoader } from './utils/createUserLoader'
import { createUpdootLoader } from './utils/createUpdootLoader'
import { Post } from './entities/Post'

const main = async () => {
  await createConnection({
    type: 'postgres',
    database: 'reddit2',
    username: 'kozbara',
    password: 'admin',
    logging: true,
    synchronize: true,
    migrations: [path.join(__dirname, './migrations/*')],
    entities: [User, Post, Updoot],
  })
  // await conn.runMigrations()
  // await Post.delete({})
  const app = express()

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
      resolvers: [HelloResolver, PostResolver, UserResolver],
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

  app.listen(4020, () => {
    console.log('server start on localhost:4020')
  })

  // const post = orm.em.create(Post, {title: 'my first post'});
  // console.log('---------------sql 2--------------');
  // await orm.em.persistAndFlush(post);

  // const posts = await orm.em.find(Post, {});
  // console.log(posts);
}

main().catch((err) => {
  console.error(err)
})
