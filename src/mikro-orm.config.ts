// import { __prod__ } from './constants'
// import { Post } from './entities/Post'
// import { MikroORM } from '@mikro-orm/core'
// import path from 'path'
// import { User } from './entities/User'

// export default {
//   migrations: {
//     path: path.join(__dirname, './migrations'), // path to the folder with migrations
//     pattern: /^[\w-]+\d+\.[tj]s$/, // regex pattern for the migration files
//     disableForeignKeys: false,
//   },
//   dbName: 'reddit',
//   type: 'postgresql',
//   user: 'admin',
//   password: 'admin',
//   debug: !__prod__,
//   entities: [Post, User],
// } as Parameters<typeof MikroORM.init>[0]
