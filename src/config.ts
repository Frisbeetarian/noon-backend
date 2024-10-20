// config.ts
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
    postgres: {
      database: env.get('POSTGRESQL_DATABASE').required().asString(),
      username: env.get('POSTGRESQL_USERNAME').required().asString(),
      password: env.get('POSTGRESQL_PASSWORD').required().asString(),
      host: env.get('POSTGRESQL_HOST').default('localhost').asString(),
      port: env.get('POSTGRESQL_PORT').default(5432).asPortNumber(),
      url: env.get('POSTGRESQL_URL').asString(),
    },
  },
  redis: {
    url: env.get('REDIS_URL').required().asString(),
  },
  session: {
    secret: env.get('SESSION_SECRET').required().asString(),
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
  socket: {},
  rabbitMQ: {
    username: env.get('RABBIT_MQ_USERNAME').required().asString(),
    password: env.get('RABBIT_MQ_PASSWORD').required().asString(),
  },
}

export default config
