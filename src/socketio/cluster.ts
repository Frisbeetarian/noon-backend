// const cluster = require('cluster')
// const http = require('http')
// const { setupMaster } = require('@socket.io/sticky')
//
// const WORKERS_COUNT = 4
//
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
//
//   const httpServer = http.createServer()
//   setupMaster(httpServer, {
//     loadBalancingMethod: 'least-connection', // either "random", "round-robin" or "least-connection"
//   })
//   const PORT = process.env.PORT || 4020
//
//   httpServer.listen(PORT, () =>
//     console.log(`server listening at http://localhost:${PORT}`)
//   )
// } else {
//   console.log(`Worker ${process.pid} started`)
//   require('./index')
// }

import * as http from 'http'
import * as socketIo from 'socket.io'
import * as redisIo from 'socket.io-redis'
import * as pubsubIo from 'socket.io-redis-pubsub'
import * as cors from 'cors'
import * as redis from 'redis'

// Create the Redis client
const redisClient = redis.createClient({ host: 'localhost', port: 6379 })

// Create the Socket.IO server
const server = http.createServer()
const io = socketIo(server)

// Use the socket.io-redis adapter to enable clustering
io.adapter(redisIo({ host: 'localhost', port: 6379 }))

// Use the socket.io-redis-pubsub adapter to enable pub/sub messaging
io.adapter(
  pubsubIo({
    host: 'localhost',
    port: 6379,
    pubClient: redisClient,
    subClient: redisClient,
  })
)

// Enable CORS
io.origins((origin, callback) => {
  if (origin === 'http://example.com') {
    callback(null, true)
  } else {
    callback(new Error('Invalid origin'))
  }
})
