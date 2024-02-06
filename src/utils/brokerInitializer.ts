// @ts-nocheck
// const { RPCClient } = require('@noon/rabbit-mq-rpc/client')
import { RPCClient } from '@noon/rabbit-mq-rpc'

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
  RELAY_SERVER: {
    channel: 'relay',
    queue: 'rpc_queue.noon.relay',
  },
  MEDIA_SERVER: {
    channel: 'media',
    queue: 'rpc_queue.noon.media',
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
  try {
    await Promise.all(
      Object.values(QUEUES).map(async ({ channel, queue }) => {
        await client.addChannel({
          name: channel,
          queue,
        })

        await client.rpcRequest(channel, 'heartbeat', {})
      })
    )

    console.log('RPC_CONNECTION_SUCCESSFUL')
  } catch (e) {
    console.log('RPC_CONNECTION_FAILED', JSON.stringify(e))
    setTimeout(() => {
      console.error(e)
      process.exit(1)
    }, 2000)
  }
  rpcClientInitialized = true
}

async function relayRPCRequest(channel, task, params) {
  try {
    return await client.rpcRequest(channel, task, params)
  } catch (e) {
    console.log('error:', e)
    return null
  }
}

async function mediaRPCRequest(channel, task, params) {
  try {
    return await client.rpcRequest(channel, task, params)
  } catch (e) {
    console.log('error:', e)
    return null
  }
}

async function searchRPCRequest(channel, task, params) {
  try {
    return await client.rpcRequest(channel, task, params)
  } catch (e) {
    console.log('error:', e)
    return null
  }
}

function relay() {
  const channel = QUEUES.RELAY_SERVER.channel

  return {
    async sendEmail({ from, email, html, task, subject }) {
      try {
        return await relayRPCRequest(channel, 'SEND_EMAIL', {
          from,
          email,
          html,
          task,
          subject,
        })
      } catch (e) {
        console.log('error:', e)
        return null
      }
    },
  }
}

function media() {
  const channel = QUEUES.MEDIA_SERVER.channel

  return {
    async sendImage({
      file,
      task,
      conversationUuid,
      conversationType,
      senderProfileUuid,
      senderProfileUsername,
      messageUuid,
      participantUuids = [],
    }) {
      try {
        // console.log('file in send iamge:', file)
        return await mediaRPCRequest(channel, 'UPLOAD_IMAGE', {
          file,
          task,
          conversationUuid,
          conversationType,
          senderProfileUsername,
          senderProfileUuid,
          messageUuid,
          participantUuids,
        })
      } catch (e) {
        console.log('error:', e)
        return null
      }
    },
    async sendAudioRecording({
      file,
      task,
      conversationUuid,
      conversationType,
      senderProfileUuid,
      senderProfileUsername,
      messageUuid,
      participantUuids = [],
    }) {
      try {
        const mediaResponse = await mediaRPCRequest(
          channel,
          'UPLOAD_AUDIO_RECORDING',
          {
            file,
            task,
            conversationUuid,
            conversationType,
            senderProfileUsername,
            senderProfileUuid,
            messageUuid,
            participantUuids,
          }
        )

        return mediaResponse
      } catch (e) {
        console.log('error:', e)
        return null
      }
    },
  }
}

function search() {
  const channel = QUEUES.SEARCH_SERVER.channel

  return {
    async indexProfile({ profile }) {
      try {
        return await searchRPCRequest(channel, 'INDEX_PROFILE', { profile })

        // return response
      } catch (e) {
        console.log('error:', e)
        return null
      }
    },

    async updateEntryInIndex({ index, senderUuid, recipientProfile }) {
      try {
        return await searchRPCRequest(channel, 'UPDATE_PROFILE', {
          index,
          senderUuid,
          recipientProfile,
        })
      } catch (e) {
        console.log(e)
      }
    },

    async searchForProfileByUsername({ username, senderUuid }) {
      try {
        return await searchRPCRequest(
          channel,
          'SEARCH_FOR_PROFILE_BY_USERNAME',
          {
            username,
            senderUuid,
          }
        )
      } catch (e) {
        console.log('error:', e)
        return null
      }
    },

    async searchForProfile({ profileUuid }) {
      try {
        return await searchRPCRequest(channel, 'SEARCH_FOR_PROFILE', {
          profileUuid,
        })
      } catch (e) {
        console.log('error:', e)
        return null
      }
    },
  }
}

module.exports.initRPCClient = initRPCClient
module.exports.search = search
module.exports.relay = relay
module.exports.media = media
