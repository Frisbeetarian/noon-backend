declare global {
  namespace NodeJS {
    interface ProcessEnv {
      NODE_ENV: string
      POSTGRESQL_DATABASE: string
      POSTGRESQL_USERNAME: string
      POSTGRESQL_PASSWORD: string
      POSTGRESQL_URL: string
      REDIS_URL: string
      PORT: string
      SESSION_SECRET: string
      CORS_ORIGIN: string
      RABBIT_MQ_USERNAME: string
      RABBIT_MQ_PASSWORD: string
    }
  }
}

export {}
