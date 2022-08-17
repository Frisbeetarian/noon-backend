import { Client } from '@elastic/elasticsearch'

let client = new Client({
  node: 'http://localhost:9200',
})

export const testQuery = async function () {
  try {
    const response = await client.index({
      index: '2osrob-3ind-el-saba2',
      document: {
        character: 'salat el nabi',
        quote: 'kheryo.',
      },
    })

    // console.log('response from es:', response)

    return response
  } catch (e) {
    console.log('error:', e)
  }
}
