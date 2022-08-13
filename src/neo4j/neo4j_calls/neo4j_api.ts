import neo4j from 'neo4j-driver'
import { parse, stringify, toJSON, fromJSON } from 'flatted'

var driver = neo4j.driver(
  'bolt://localhost:7687',
  neo4j.auth.basic('neo4j', 'test')
)

export const getProfiles = async function () {
  var session = driver.session()
  let profiles = []

  await session
    .run(
      'MATCH (p:Profile)' +
        ' OPTIONAL MATCH (p)-[user:USER]->(u)' +
        ' return p, user'
    )
    .then((result) => {
      result.records.forEach((record) => {
        // profiles[record._fields[0].properties.uuid] = {
        //   uuid: record._fields[0].properties.uuid,
        //   username: record._fields[0].properties.username,
        //   name: record._fields[0].properties.name,
        //   user: {
        //     uuid: record._fields[1].properties.userUuid,
        //     username: record._fields[1].properties.username,
        //     name: record._fields[1].properties.name,
        //   },
        // }

        profiles.push({
          uuid: record._fields[0].properties.uuid,
          username: record._fields[0].properties.username,
          name: record._fields[0].properties.name,
          user: {
            uuid: record._fields[1].properties.userUuid,
            username: record._fields[1].properties.username,
            name: record._fields[1].properties.name,
          },
          // friends: { ...record._fields[2].properties },
        })
      })
    })
    .then((result) => {
      return session.run(
        'MATCH (p:Profile)' +
          ' OPTIONAL MATCH (p)-[friends:FRIENDS]->(m)' +
          ' return friends, p'
      )
    })
    .then((results) => {
      results.records.forEach((record) => {
        const profile = profiles.find(
          ({ uuid }) => uuid === record._fields[1].properties.uuid
        )

        console.log('profile:', profile)

        if (!profile['friends']) {
          profile['friends'] = []
          profile['friends'].push(record._fields[0].properties)
        } else {
          profile['friends'].push(record._fields[0].properties)
        }

        // console.log('profile friends results:', profile)
        // profile.friends =

        // profiles[record._fields[1].properties.uuid] = {
        //   ...profiles[record._fields[1].properties.uuid],
        //   friends: {
        //     ...profiles[record._fields[1].properties.uuid].friends,
        //     [record._fields[0].properties.friendUuid]:
        //       record._fields[0].properties,
        //   },
        // }
      })
    })
    .catch((error) => {
      console.log('error')

      console.log(error)
    })
    .then(() => {
      session.close()
    })

  // console.log('profiles in get profiles:', JSON.stringify(profiles))
  return profiles
}

export const createUserAndAssociateWithProfile = async function (
  user,
  profile
) {
  let session = driver.session()
  const tx = session.beginTransaction()

  try {
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

  try {
    tx.run(
      'Match (p1:Profile {uuid: $sUuid})' +
        ' Match (p2:Profile {uuid: $rUuid})' +
        ' MERGE (p1)-[friendRequest:FRIEND_REQUEST]->(p2)' +
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
}

export const acceptFriendRequest = async function (
  senderProfileUuid,
  senderProfileUsername,
  recipientProfileUuid,
  recipientProfileUsername
) {
  let session = driver.session()
  const tx = session.beginTransaction()

  try {
    tx.run(
      'Match (p1:Profile {uuid: $sUuid}) ' +
        ' Match (p2:Profile {uuid: $rUuid})' +
        ' Merge (p1)-[friends:FRIENDS {uuid: $recipientProfileUuid, username: $recipientProfileUsername }]->(p2)' +
        ' Merge (p2)-[:FRIENDS {uuid: $senderProfileUuid, username: $senderProfileUsername }]->(p1)' +
        ' WITH p1, friends, p2' +
        ' Match (p1)-[fr:FRIEND_REQUEST]->(p2)' +
        ' DELETE fr' +
        ' RETURN p1, friends, p2',
      {
        sUuid: senderProfileUuid,
        rUuid: recipientProfileUuid,
        recipientProfileUuid,
        recipientProfileUsername,
        senderProfileUsername,
        senderProfileUuid,
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
