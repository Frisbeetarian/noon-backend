declare global {
  namespace NodeJS {
    interface ProcessEnv {
      NEO4J_USERNAME: string;
      NEO4J_PASSWORD: string
      NEO4J_URI: string
      NODE_ENV: string
      POSTGRESQL_USERNAME: string
      POSTGRESQL_PASSWORD: string
      REDIS_URL: string
      PORT: string
      SESSION_SECRET: string;
      SOCKET_INSTRUMENT_USERNAME: string
      SOCKET_INSTRUMENT_PASSWORD: string
    }
  }
}

export {}
