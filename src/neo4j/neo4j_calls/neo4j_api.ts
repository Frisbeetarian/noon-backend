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
export const sendFriendRequest = async function (senderUuid, targetUuid) {
  try {
    // console.log('senderUuid:', senderUuid)
    // console.log('targetUuid:', targetUuid)

    const senderProfile = await driver.model('Profile').find(senderUuid)
    const receiverProfile = await driver.model('Profile').find(targetUuid)
    // const receiverProfile = await driver.first('profile', 'id', targetUuid)
    // console.log('senderProfile:', senderProfile)
    // console.log('receiverProfile:', receiverProfile)

    await senderProfile.relateTo(receiverProfile, 'friendshipRequest')

    return true
  } catch (e) {
    console.log('error in neo:', e)
    return false
  }
}

export const acceptFriendRequest = async function (
  senderProfileUuid,
  recipientProfileUuid
) {
  console.log('AU MILIEU DU TRESOR')
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

export const getProfiles = async function () {
  var session = driver.session()

  let profiles = []
  session
    // .run('MATCH (p:Profile)-[:FRIENDS]-(b) return p, b')
    .run(
      'MATCH (p:Profile)' +
        'OPTIONAL MATCH (p)-[r:FRIENDS]-(m)' +
        'OPTIONAL MATCH (p)-[rr:USER]-(u)' +
        ' return p, r, rr, u'
    )
    .then((result) => {
      // return result
      result.records.forEach((record) => {
        console.log('GREGERGERGERGERGERGER:', record._fields)

        // console.log(record)
      })
    })
    .catch((error) => {
      console.log('error')

      console.log(error)
    })
    .then(() => {
      session.close()
    })

  // const fetchedProfiles = await driver
  //   .model('Profile')
  //   .all()
  //   .then((collection) => {
  //     for (let profile of collection) {
  //       const friendsCollectionsOnProfile = profile.get('friends')
  //
  //       driver
  //         // .cypher('MATCH (p:Profile {id: $id})-[:FRIENDS]-(b) RETURN p, b', {
  //         .cypher(
  //           'MATCH (profile1:Profile {id: $id})-[:FRIENDS]-(profile2) RETURN profile2',
  //           {
  //             id: profile.get('id'),
  //           }
  //         )
  //         .then((res) => {
  //           // console.log(res.records)
  //           console.log('/n' + profile.get('username') + 'friends: ')
  //
  //           res.records.map((record) => {
  //             console.log(record._fields[0].properties)
  //           })
  //         })
  //       // if (friendsCollectionsOnProfile) {
  //       //   // console.log(
  //       //   //   "LILy's in the bar for a bar fight:",
  //       //   //   profile.get('friends')._end._properties
  //       //   // )
  //       // }
  //       // profile._properties.set(profile._properties.uuid)
  //       profile._properties.__typename = 'Profile'
  //       profile.get('user')._end._properties.__typename = 'User'
  //
  //       let profileObject = profile._properties.set(
  //         'user',
  //         profile.get('user')._end._properties
  //       )
  //
  //       if (friendsCollectionsOnProfile) {
  //         profileObject.set('friends', profile.get('friends'))
  //
  //         // console.log(
  //         //   profile.get('username') + 'friends: ',
  //         //   profile.get('friends')
  //         // )
  //       }
  //
  //       profiles.push(profileObject)
  //     }
  //
  //     return profiles
  //   })
  // console.log('profiles in neo: ', profiles)

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

export const createUserAndAssociateWithProfile = async function (
  user,
  profile
) {
  let session = driver.session()
  const tx = session.beginTransaction()

  try {
    // .run('MATCH (p:Profile)-[:FRIENDS]-(b) return p, b')

    tx.run(
      ' CREATE (a:User {id: $id, username: $username, name: $name}) ' +
        ' CREATE (b:Profile {id: $id, username: $username, name: $name})' +
        ' CREATE (a)-[:PROFILE]->(b)' +
        ' CREATE (b)-[:USER]->(a)' +
        ' RETURN a, b',
      {
        id: user.id,
        username: user.username,
        name: user.username,
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

    // tx.run(
    //   `CREATE (user:User {id: $userId , name: $userName, username: $userUsername})`,
    //   {
    //     userId: user.id,
    //     userName: user.username,
    //     userUsername: user.username,
    //     profileId: profile.id,
    //     profileUsername: user.username,
    //     profileName: user.username,
    //   }
    // )
    //   .then((result) => {
    //     result.records.forEach((record) => {
    //       console.log(record)
    //     })
    //   })
    //   .catch((error) => {
    //     console.log(error)
    //   })
    //   .then(() => session.close())

    // Promise.all([
    //   driver.create('User', {
    //     id: user.id,
    //     name: user.username,
    //     username: user.username,
    //   }),
    //   driver.create('Profile', {
    //     id: profile.id,
    //     name: user.username,
    //     username: user.username,
    //   }),
    // ]).then(([user, profile]) => {
    //   user.relateTo(profile, 'profile').then((res) => {
    //     console.log(
    //       res.startNode().get('name'),
    //       ' has known ',
    //       res.endNode().get('name'),
    //       'since',
    //       res.get('since')
    //     )
    //   })
    //
    //   profile.relateTo(user, 'user')
    // })
  } catch (e) {}
  // finally {
  //   await driver.close()
  // }
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
