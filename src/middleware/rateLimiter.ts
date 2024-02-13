import rateLimit from 'express-rate-limit'

module.exports = function (
  redis: any,
  RedisStore: new (arg0: { client: any; prefix: string }) => any
) {
  const loginLimiter = rateLimit({
    windowMs: 10 * 60 * 1000, // 10 minutes
    limit: 5,
    store: new RedisStore({
      client: redis,
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

  const registerLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    limit: 5,
    store: new RedisStore({
      client: redis,
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

  return { loginLimiter, registerLimiter }
}
