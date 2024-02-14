import { rateLimit } from 'express-rate-limit'
import { RedisStore } from 'rate-limit-redis'
import redisClient from '../config/redisClient'
const defaultSettings = {
  standardHeaders: true,
  legacyHeaders: false,
}

export const messageLimiter = rateLimit({
  ...defaultSettings,
  windowMs: 60 * 1000, // 1 minute
  limit: 100,
  store: new RedisStore({
    // @ts-expect-error - Known issue: the `call` function is not present in @types/ioredis
    sendCommand: (...args: string[]) => redisClient.call(...args),
    prefix: 'message_limiter_',
  }),
  message: 'Too many message attempts. Please try again later.',
  handler: (_req, res, _next, options) => {
    res.status(options.statusCode).json({
      error: options.message,
      retryAfter: Math.ceil(options.windowMs / 1000),
    })
  },
})

export const globalLimiter = rateLimit({
  ...defaultSettings,
  windowMs: 60 * 1000, // 1 minute
  limit: 50,
  store: new RedisStore({
    // @ts-expect-error - Known issue: the `call` function is not present in @types/ioredis
    sendCommand: (...args: string[]) => redisClient.call(...args),
    prefix: 'global_limiter_',
  }),
  handler: (_req, res, _next, options) => {
    res.status(options.statusCode).json({
      error: options.message,
      retryAfter: Math.ceil(options.windowMs / 1000),
    })
  },
  skip: (req) =>
    [
      '/api/messages/handleMessage',
      '/api/messages/handleGroupMessage',
      '/api/users/register',
      '/api/users/login',
    ].includes(req.baseUrl),
})

export const loginLimiter = rateLimit({
  ...defaultSettings,
  windowMs: 10 * 60 * 1000, // 10 minutes
  limit: 5,
  store: new RedisStore({
    // @ts-expect-error - Known issue: the `call` function is not present in @types/ioredis
    sendCommand: (...args: string[]) => redisClient.call(...args),
    prefix: 'login_limiter_',
  }),
  message: 'Too many login attempts. Please try again later.',
  handler: (_req, res, _next, options) => {
    res.status(options.statusCode).json({
      error: options.message,
      retryAfter: Math.ceil(options.windowMs / 1000),
    })
  },
})

export const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  ...defaultSettings,
  limit: 5,
  store: new RedisStore({
    // @ts-expect-error - Known issue: the `call` function is not present in @types/ioredis
    sendCommand: (...args: string[]) => redisClient.call(...args),
    prefix: 'register_limiter_',
  }),
  message: 'Too many registration attempts. Please try again later.',
  handler: (_req, res, _next, options) => {
    res.status(options.statusCode).json({
      error: options.message,
      retryAfter: Math.ceil(options.windowMs / 1000),
    })
  },
})
