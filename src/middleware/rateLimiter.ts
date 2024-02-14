import rateLimit from 'express-rate-limit'
import RedisStore from 'rate-limit-redis'
import redisClient from '../config/redisClient'

export const globalLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  limit: 50,
  standardHeaders: true, // Return 'RateLimit-*' headers in the response
  legacyHeaders: false, // Disable X-RateLimit-* headers
  store: new RedisStore({
    client: redisClient,
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
    ].includes(req.baseUrl),
})

export const messageLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  limit: 100,
  store: new RedisStore({
    client: redisClient,
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

export const loginLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  limit: 5,
  store: new RedisStore({
    client: redisClient,
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
  limit: 5,
  store: new RedisStore({
    client: redisClient,
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
