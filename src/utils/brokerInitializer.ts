const { RPCClient } = require('@noon/rabbit-mq-rpc/client')

const connectionObject = {
  protocol: 'amqp',
  hostname: 'localhost',
  port: 5672,
  username: 'guest',
  password: 'guest',
  locale: 'en_US',
  vhost: '/',
}

const QUEUES = {
  SEARCH_SERVER: {
    channel: 'search',
    queue: 'rpc_queue.noon.search',
  },
}

const client = new RPCClient({
  connectionObject,
  hostId: 'localhost',
})

let rpcClientInitialized = false
async function initRPCClient() {
  if (rpcClientInitialized) {
    return
  }

  await Promise.all(
    Object.values(QUEUES).map(async ({ channel, queue }) => {
      await client.addChannel({
        name: channel,
        queue,
      })
    })
  )

  rpcClientInitialized = true
}

async function searchRPCRequest(channel, task, params) {
  await initRPCClient()
  try {
    return await client.rpcRequest(channel, task, params)
  } catch (e) {
    console.log('error:', e)
    return null
  }
}

function search() {
  const channel = QUEUES.SEARCH_SERVER.channel

  return {
    async searchForProfile({ profileUuid }) {
      try {
        return await searchRPCRequest(channel, 'SEARCH_FOR_PROFILE', {
          profileUuid,
        })

        // return response
      } catch (e) {
        console.log('error:', e)
        return null
      }
    },
  }
}

module.exports.search = search
