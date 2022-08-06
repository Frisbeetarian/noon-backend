import neo4j from 'neo4j-driver'
import creds from '../config/credentials'
const { Neo4jGraphQL } = require('@neo4j/graphql')
import { ApolloServer, gql } from 'apollo-server-express'
import Neode from 'neode'
import { User } from '../models/User'
import { Profile } from '../models/Profile'

const typeDefs = gql`
  type Movie {
    title: String
    actors: [Actor!]! @relationship(type: "ACTED_IN", direction: IN)
  }

  type Actor {
    name: String
    movies: [Movie!]! @relationship(type: "ACTED_IN", direction: OUT)
  }
`

// let driver = neo4j.driver(
//   'bolt://0.0.0.0:7687',
//   neo4j.auth.basic(creds.neo4jusername, creds.neo4jpw)
// )

const driver = new Neode('bolt://localhost:7687', 'neo4j', 'test').with({
  User,
  Profile,
})

export const getProfiles = async function () {
  let profiles = []
  try {
    const fetchedProfiles = await driver
      .model('Profile')
      .all()
      .then((collection) => {
        for (let profile of collection) {
          // profile._properties.set(profile._properties.uuid)
          profile._properties.__typename = 'Profile'
          profile.get('user')._end._properties.__typename = 'User'

          const profileObject = profile._properties.set(
            'user',
            profile.get('user')._end._properties
          )

          profiles.push(profileObject)
        }

        return profiles
      })
    // console.log('profiles in neo: ', profiles)

    return profiles
  } catch (e) {
    console.log('error retrieving profiles: ', e)
  }

  return false
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
  try {
    Promise.all([
      driver.create('User', {
        id: user.id,
        name: user.username,
        username: user.username,
      }),
      driver.create('Profile', {
        id: profile.id,
        name: user.username,
        username: user.username,
      }),
    ]).then(([user, profile]) => {
      user.relateTo(profile, 'profile').then((res) => {
        console.log(
          res.startNode().get('name'),
          ' has known ',
          res.endNode().get('name'),
          'since',
          res.get('since')
        )
      })

      profile.relateTo(user, 'user')
    })
  } catch (e) {
  } finally {
    await driver.close()
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
