import neo4j, { Driver } from 'neo4j-driver'

/**
 * Singleton connection driver Neo4j
 *
 * @return {Neo4jDriver}
 */
let instance: Driver | null = null
const getNeo4jConnection = () => {
  // its already instanced
  if (instance) {
    return instance
  }

  // get info from env
  const { connection_string, NEO4J_USERNAME, NEO4J_PASSWORD, config } = getEnv()

  // create instance
  instance = neo4j.driver(
    connection_string,
    neo4j.auth.basic(NEO4J_USERNAME, NEO4J_PASSWORD),
    config
  )

  return instance
}

/**
 *
 * Generate Object config using .env configuration
 *
 * @return {Object}
 */
const getEnv = () => {
  const {
    NEO4J_PROTOCOL = 'bolt',
    NEO4J_HOST = 'localhost',
    NEO4J_PORT = '7687',
    NEO4J_USERNAME = process.env.NEO4J_USERNAME,
    NEO4J_PASSWORD = process.env.NEO4J_PASSWORD,
    NEO4J_ENTERPRISE = 'false',
    NEO4J_DATABASE = 'neo4j',
  } = process.env

  const connection_string = `${NEO4J_PROTOCOL}://${NEO4J_HOST}:${NEO4J_PORT}`
  const enterprise = NEO4J_ENTERPRISE === 'true'

  // Build additional config
  const config = {}

  return {
    connection_string,
    NEO4J_USERNAME,
    NEO4J_PASSWORD,
    enterprise,
    NEO4J_DATABASE,
    config,
  }
}

const getInstance = () => {
  return neo4j
}

export { getNeo4jConnection, getInstance }
