// import { EntityManager, IDatabaseDriver, Connection } from '@mikro-orm/core'
import { Request, Response } from 'express'
import session from 'express-session'
import { Redis } from 'ioredis'
import { createUpdootLoader } from './utils/createUpdootLoader'
import { createUserLoader } from './utils/createUserLoader'
import { createMessageLoader } from './utils/createMessageLoader'

export type MyContext = {
  // em: EntityManager<any> & EntityManager<IDatabaseDriver<Connection>>
  // & in typescript joins the 2 types together
  req: Request & { session: session.Session }
  // req: Request;
  res: Response
  redis: Redis
  // io: Socket
  userLoader: ReturnType<typeof createUserLoader>
  // profilesLoader: ReturnType<typeof createProfileLoader>
  updootLoader: ReturnType<typeof createUpdootLoader>
  messageLoader: ReturnType<typeof createMessageLoader>
}
