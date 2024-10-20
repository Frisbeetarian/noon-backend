import dotenv from 'dotenv'
import * as env from 'env-var'

dotenv.config()

const config = {
  app: {
    port: env.get('PORT').default(4020).asPortNumber(),
    env: env.get('NODE_ENV').default('development').asString(),
    trustProxy: env.get('TRUST_PROXY').default('false').asBool(),
  },
  db: {
    mongoUri: env.get('MONGODB_URI').required().asString(),
  },
  cors: {
    origins: env.get('CORS_ORIGIN').default('*').asArray(','),
  },
  rateLimit: {
    windowMs: env
      .get('RATE_LIMIT_WINDOW_MS')
      .default(15 * 60 * 1000)
      .asIntPositive(),
    maxRequests: env
      .get('RATE_LIMIT_MAX_REQUESTS')
      .default(100)
      .asIntPositive(),
  },
  log: {
    level: env.get('LOG_LEVEL').default('info').asString(),
  },
}

export default config
