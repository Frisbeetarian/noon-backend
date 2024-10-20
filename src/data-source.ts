import { Sequelize } from 'sequelize'
import config from './config'
import { createLogger, format, transports } from 'winston'
import { User } from './models/User'

const logger = createLogger({
  level: config.log.level,
  format: format.combine(format.timestamp(), format.json()),
  transports: [new transports.Console()],
})

export const sequelize = new Sequelize(
  config.db.postgres.database,
  config.db.postgres.username,
  config.db.postgres.password,
  {
    host: config.db.postgres.host,
    port: config.db.postgres.port,
    dialect: 'postgres',
    logging: (msg) => logger.info(msg),
  }
)

export const connectToDatabase = async (): Promise<void> => {
  let retries = 5
  while (retries) {
    try {
      await sequelize.authenticate()
      logger.info('Connected to Postgres')
      await sequelize.sync()
      break
    } catch (error) {
      retries -= 1
      logger.error('Error connecting to Postgres', { error, retries })
      if (retries === 0) throw error
      await new Promise((res) => setTimeout(res, 5000))
    }
  }
}

export const disconnectFromDatabase = async (): Promise<void> => {
  try {
    await sequelize.close()
    logger.info('Disconnected from Postgres')
  } catch (error) {
    logger.error('Error disconnecting from Postgres', { error })
    throw error
  }
}
