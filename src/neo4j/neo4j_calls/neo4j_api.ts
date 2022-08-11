import neo4j from 'neo4j-driver'
import creds from '../config/credentials'
const { Neo4jGraphQL } = require('@neo4j/graphql')
import { ApolloServer, gql } from 'apollo-server-express'
import Neode from 'neode'
import { User } from '../models/User'
import { Profile } from '../models/Profile'
import { parse, stringify, toJSON, fromJSON } from 'flatted'
// const typeDefs = gql`
//   type Movie {
//     title: String
//     actors: [Actor!]! @relationship(type: "ACTED_IN", direction: IN)
//   }
//
//   type Actor {
//     name: String
//     movies: [Movie!]! @relationship(type: "ACTED_IN", direction: OUT)
//   }
// `

// let driver = neo4j.driver(
//   'bolt://0.0.0.0:7687',
//   neo4j.auth.basic(creds.neo4jusername, creds.neo4jpw)
// )

// const driver = new Neode('bolt://localhost:7687', 'neo4j', 'test').with({
//   User,
//   Profile,
// })

var driver = neo4j.driver(
  'bolt://localhost:7687',
  neo4j.auth.basic('neo4j', 'test')
)

export const createUserAndAssociateWithProfile = async function (
  user,
  profile
) {
  let session = driver.session()
  const tx = session.beginTransaction()
  // console.log('user in create:', user)
  // console.log('profile in create:', profile)

  try {
    // .run('MATCH (p:Profile)-[:FRIENDS]-(b) return p, b')

    tx.run(
      ' CREATE (a:User {uuid: $id, username: $username, name: $name}) ' +
        ' CREATE (b:Profile {uuid: $profileId, username: $username, name: $name})' +
        ' CREATE (a)-[:PROFILE {username: $username, name: $name, profileUuid: $profileId}]->(b)' +
        ' CREATE (b)-[:USER {username: $username, name: $name, userUuid: $id}]->(a)' +
        ' RETURN a, b',
      {
        id: user.uuid,
        username: user.username,
        name: user.username,
        profileId: profile.uuid,
      }
    )
      .then((result) => {
        result.records.forEach((record) => {
          console.log(record)
        })
        return tx.commit()
      })
      .then(() => {
        session.close()
        // driver.close()
      })
      .catch((exception) => {
        console.log(exception)
        session.close()
        // driver.close()
      })
  } catch (e) {}
}

export const getProfiles = async function () {
  var session = driver.session()

  let profiles = []
  // .run('MATCH (p:Profile)-[:FRIENDS]-(b) return p, b')

  await session
    .run(
      'MATCH (p:Profile)' +
        'OPTIONAL MATCH (p)-[friends:FRIENDS]-(m)' +
        'OPTIONAL MATCH (p)-[user:USER]-(u)' +
        ' return p, user, friends'
    )
    .then((result) => {
      // return result
      result.records.forEach((record) => {
        // console.log('GREGERGERGERGERGERGER:', {
        //   uuid: record._fields[0].properties.uuid,
        //   username: record._fields[0].properties.username,
        //   name: record._fields[0].properties.name,
        //   user: {
        //     uuid: record._fields[1].properties.userUuid,
        //     username: record._fields[1].properties.username,
        //     name: record._fields[1].properties.name,
        //   },
        //   friends: null,
        // })

        profiles.push({
          uuid: record._fields[0].properties.uuid,
          username: record._fields[0].properties.username,
          name: record._fields[0].properties.name,
          user: {
            uuid: record._fields[1].properties.userUuid,
            username: record._fields[1].properties.username,
            name: record._fields[1].properties.name,
          },
        })
        // const profileObject = new Set()
        // profileObject.add({
        //   uuid: record._fields[0].properties.uuid,
        //   username: record._fields[0].properties.username,
        //   name: record._fields[0].properties.name,
        //   user: {
        //     uuid: record._fields[1].properties.uuid,
        //     username: record._fields[1].properties.username,
        //     name: record._fields[1].properties.name,
        //   },
        //   friends: null,
        // })
        // profileObject.add(record._fields[0].properties.username)
        // profileObject.add(record._fields[0].properties.name)
        // console.log('GREGERGERGERGERGERGER:', profileObject)

        // const { Relationship } = record._fields
        //
        // record._fields.forEach((field) => {
        //   // console.log('GREGERGERGERGERGERGER:', field)
        //   // console.log('RELATIONSHIP:', field)
        // })
      })
    })
    .catch((error) => {
      console.log('error')

      console.log(error)
    })
    .then(() => {
      session.close()
    })

  return profiles
}

export const getProfileByUsername = async function (username: string | number) {
  try {
    const profile = driver
      .first('profile', 'username', username)
      .then((collection) => {})

    return profile
  } catch (e) {}
}

export const sendFriendRequest = async function (senderUuid, targetUuid) {
  console.log('senderUuid:', senderUuid)
  console.log('targetUuid:', targetUuid)

  let session = driver.session()
  const tx = session.beginTransaction()

  // console.log('user in create:', user)
  // console.log('profile in create:', profile)

  try {
    // .run('MATCH (p:Profile)-[:FRIENDS]-(b) return p, b')

    tx.run(
      ' Match (p1:Profile {uuid: $sUuid}) ' +
        ' Match (p2:Profile {uuid: $rUuid})' +
        ' CREATE (p1)-[friendRequest:FRIEND_REQUEST]->(p2)' +
        ' RETURN p1, friendRequest, p2',
      {
        sUuid: senderUuid,
        rUuid: targetUuid,
      }
    )
      .then((result) => {
        result.records.forEach((record) => {
          console.log(record)
        })
        return tx.commit()
      })
      .then(() => {
        session.close()
        // driver.close()
      })
      .catch((exception) => {
        console.log(exception)
        session.close()
        // driver.close()
      })
  } catch (e) {}
  // try {
  //   const senderProfile = await driver.model('Profile').find(senderUuid)
  //   const receiverProfile = await driver.model('Profile').find(targetUuid)
  //   // const receiverProfile = await driver.first('profile', 'id', targetUuid)
  //   // console.log('senderProfile:', senderProfile)
  //   // console.log('receiverProfile:', receiverProfile)
  //
  //   await senderProfile.relateTo(receiverProfile, 'friendshipRequest')
  //
  //   return true
  // } catch (e) {
  //   console.log('error in neo:', e)
  //   return false
  // }
}

export const acceptFriendRequest = async function (
  senderProfileUuid,
  recipientProfileUuid
) {
  try {
    const senderProfile = await driver.model('Profile').find(senderProfileUuid)
    const recipientProfile = await driver
      .model('Profile')
      .find(recipientProfileUuid)

    await senderProfile.detachFrom(recipientProfile, 'friendshipRequest')
    await senderProfile.relateTo(recipientProfile, 'friends')
    await recipientProfile.relateTo(senderProfile, 'friends')

    return true
  } catch (e) {
    console.log('error in neo establish friendship:', e)
    return false
  }
}

// const neoSchema = new Neo4jGraphQL({ typeDefs, driver })
// driver.withDirectory('./models');

export const get_num_nodes = async function () {
  await driver.all('User').then((collection) => {
    console.log(collection.length) // 1
    console.log(collection.get(0).get('name')) // 'Adam'
  })

  let session = driver.session()
  const num_nodes = await session.run('MATCH (n) RETURN n', {})
  // session.close()

  driver.close()
  console.log('RESULT', !num_nodes ? 0 : num_nodes.records.length)

  // await driver.all('User', {name: 'mohamad'}, {name: 'ASC', id: 'DESC'}, 1, 0)
  //   .then(collection => {
  //     console.log(collection.length); // 1
  //     console.log(collection.get(0).get('name')); // 'Adam'
  //   })

  return !num_nodes ? 0 : num_nodes.records.length
}
export const create_user = async function (name: string) {
  // let session = driver.session()
  // let user = 'No User Was Created'

  console.log('name: ', name)
  try {
    // user = await session.run('MERGE (n:user {name: $id}) RETURN n', {
    //   id: name,
    // })
    // await driver.all('User', properties)
    await driver
      .create('User', {
        name: name,
      })
      .then((user) => {
        console.log('name from neo4j: ', user) // 'Adam'
        return name
      })
    // user = await session.run('CREATE (a:User {name: $name}) RETURN a', {
    //   name: name,
    // })

    // const singleRecord = user.records[0]
    // const node = singleRecord.get(0)
    // console.log("single record: ", singleRecord)
  } catch (err) {
    console.error(err)
    return false
  } finally {
    await driver.close()
  }

  return name
  // return user.records[0].get(0).properties.name
}
