// import { Client } from '@elastic/elasticsearch'
//
// let client = new Client({
//   node: 'http://localhost:9200',
// })
//
// export const testQuery = async function () {
//   try {
//     const response = await client.index({
//       index: '2osrob-3ind-el-saba2',
//       document: {
//         character: 'salat el nabi',
//         quote: 'khseryo.',
//       },
//     })
//
//     // console.log('response from es:', response)
//     if (response) return response
//     else return null
//   } catch (e) {
//     console.log('error:', e)
//   }
// }

// const { RPCServer } = require('@noon/rabbit-mq-rpc/server')
//
// const connectionObject = {
//   protocol: 'amqp',
//   hostname: 'localhost',
//   port: 5672,
//   username: 'guest',
//   password: 'guest',
//   locale: 'en_US',
//   vhost: '/',
// }
//
// async function establishRPCConsumer() {
//   console.log(
//     'FDSVSDVSDVSDVSDVSDVSDVSDVSDVDSVEWKEWK$K$$#E@#@#@@#@$#@$@#432423432'
//   )
//   try {
//     const rpcServer = new RPCServer({
//       connectionObject,
//       hostId: 'localhost',
//       queue: 'rpc_queue.noon.search-results',
//       handleMessage: (index, params) => {
//         console.log('RPC_SEARCH_RESULTS_RECEIVED', { index, params })
//       },
//     })
//
//     await rpcServer.start()
//
//     console.log('RPC_CONNECTION_SUCCESSFUL', {
//       hostId: 'localhost',
//       queue: 'rpc_queue.noon.search-results',
//     })
//   } catch (e) {
//     console.log('RPC_CONNECTION_FAILED', JSON.stringify(e))
//
//     setTimeout(() => {
//       console.error(e)
//       process.exit(1)
//     }, 2000)
//   }
// }
//
// establishRPCConsumer()
