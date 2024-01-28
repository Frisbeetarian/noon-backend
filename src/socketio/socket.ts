import { Server as SocketIOServer } from 'socket.io'
import { Server as HTTPServer } from 'http'

let io: any

export const initSocketIO = (httpServer: HTTPServer, redisClient) => {
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

export const getIO = () => {
  if (!io) {
    throw new Error('Socket.io not initialized!')
  }
  return io
}
