// @ts-nocheck
import { getIO } from '../socketio/socket'
import { NextFunction } from 'express'
import { createUpdootLoader } from './../utils/createUpdootLoader'
import { createUserLoader } from './../utils/createUserLoader'
import { createMessageLoader } from './../utils/createMessageLoader'

export function contextMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
) {
  try {
    const io = getIO() // Get the Socket.IO instance

    req.context = {
      userLoader: createUserLoader(),
      updootLoader: createUpdootLoader(),
      messageLoader: createMessageLoader(),
      io, // Attach the Socket.IO instance to the context
    }

    next()
  } catch (error) {
    console.error('error in context:', error)
    res.status(500).send('Internal Server Error')
  }
}
