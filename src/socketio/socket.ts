import { Server as SocketIOServer } from 'socket.io'
import { Server as HTTPServer } from 'http'
// @ts-ignore
import { RedisClient } from 'redis'

let io: SocketIOServer

export const initSocketIO = (
  httpServer: HTTPServer,
  redisClient: RedisClient
) => {
  io = new SocketIOServer(httpServer, {
    cors: {
      origin: process.env.CORS_ORIGIN,
      methods: ['GET', 'POST'],
    },
    adapter: require('socket.io-redis')({
      pubClient: redisClient,
      subClient: redisClient.duplicate(),
    }),
  })

  return io
}

export const getIO = (): SocketIOServer => {
  if (!io) {
    throw new Error(
      'Socket.io instance not initialized. Call initSocketIO first.'
    )
  }
  return io
}
