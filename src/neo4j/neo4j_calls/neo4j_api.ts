import neo4j from 'neo4j-driver'
import { parse, stringify, toJSON, fromJSON } from 'flatted'

var driver = neo4j.driver(
  'bolt://localhost:7687',
  neo4j.auth.basic('neo4j', 'test')
)

export const getProfiles = async function (loggedInProfileUuid) {
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
        profiles.push({
          uuid: record._fields[0].properties.uuid,
          username: record._fields[0].properties.username,
          name: record._fields[0].properties.name,
          user: {
            uuid: record._fields[1].properties.userUuid,
            username: record._fields[1].properties.username,
            name: record._fields[1].properties.name,
          },
          friends: [],
          friendshipRequests: [],
        })
      })
    })
    .then((result) => {
      return session.run(
        'MATCH (p:Profile)' +
          ' OPTIONAL MATCH (p)-[friends:FRIENDS]->(o)' +
          ' OPTIONAL MATCH (p)-[friendRequest:FRIEND_REQUEST]->(i)' +
          ' OPTIONAL MATCH (p)<-[friendRequestReverse:FRIEND_REQUEST]-(m)' +
          ' return friends, p, friendRequest, i, friendRequestReverse, m',
        {
          loggedInProfileUuid,
        }
      )
    })
    .then((results) => {
      // if (results.records.length == 0) {
      //   profile['friends'] = []
      // }

      results.records.forEach((record) => {
        const profile = profiles.find(
          ({ uuid }) => uuid === record._fields[1]?.properties.uuid
        )

        // if (record._fields[0]?.properties.uuid == loggedInProfileUuid) {
        //   profiles.pop(profile)
        //   return
        // }

        if (record._fields[0]?.properties !== undefined) {
          profile['friends'].push(record._fields[0]?.properties)
        }

        // if (record._fields[2]?.properties !== undefined) {
        //   record._fields[3]?.properties = {
        //     ...record._fields[3]?.properties,
        //     reverse: false,
        //   }
        //
        //   profile['friendshipRequests'].push(record._fields[3]?.properties)
        // }
        //
        // if (record._fields[4]?.properties !== undefined) {
        //   record._fields[5]?.properties = {
        //     ...record._fields[5]?.properties,
        //     reverse: true,
        //   }
        //
        //   profile['friendshipRequests'].push(record._fields[5]?.properties)
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
  console.log('profiles:', profiles)

  return profiles
}

export const getFriendsForProfile = async function (profileUuid) {
  let session = driver.session()
  let friends = []

  await session
    .run(
      'MATCH (p:Profile {uuid: $profileUuid})' +
        ' OPTIONAL MATCH (p)-[friends:FRIENDS]->(u)' +
        ' return u',
      {
        profileUuid,
      }
    )
    .then((results) => {
      results.records.forEach((record) => {
        if (record._fields[0]?.properties !== undefined) {
          friends.push(record._fields[0]?.properties)
        }
      })
    })
    .catch((error) => {
      console.log('error')
      console.log(error)
    })
    .then(() => {
      session.close()
    })

  return friends
}

export const getFriendRequestsForProfile = async function (profileUuid) {
  let session = driver.session()
  let friendRequests = []

  await session
    .run(
      'MATCH (p:Profile {uuid: $profileUuid})' +
        ' OPTIONAL MATCH (p)-[friendRequests:FRIEND_REQUEST]->(u)' +
        ' OPTIONAL MATCH (e)<-[reverseFriendRequest:FRIEND_REQUEST]-(l)' +
        ' return u, reverseFriendRequest, l',
      {
        profileUuid,
      }
    )
    .then((results) => {
      results.records.forEach((record) => {
        if (record._fields[0]?.properties !== undefined) {
          record._fields[0]?.properties = {
            ...record._fields[0]?.properties,
            reverse: false,
          }
          friendRequests.push(record._fields[0]?.properties)
        }

        if (record._fields[1]?.properties !== undefined) {
          record._fields[2]?.properties = {
            ...record._fields[2]?.properties,
            reverse: true,
          }
          friendRequests.push(record._fields[2]?.properties)
        }
      })
    })
    .catch((error) => {
      console.log(error)
    })
    .then(() => {
      session.close()
    })

  return friendRequests
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

export const sendFriendRequest = async function (
  senderProfileUuid,
  senderProfileUsername,
  recipientProfileUuid,
  recipientProfileUsername
) {
  console.log('senderProfileUuid:', senderProfileUuid)
  console.log('recipientProfileUuid:', recipientProfileUuid)

  let session = driver.session()
  const tx = session.beginTransaction()

  try {
    tx.run(
      'MATCH (p1:Profile {uuid: $sUuid})' +
        ' MATCH (p2:Profile {uuid: $rUuid})' +
        ' MERGE (p1)-[friendRequest:FRIEND_REQUEST {uuid: $recipientProfileUuid, username: $recipientProfileUsername }]->(p2)' +
        // ' MERGE (p2)-[:FRIEND_REQUEST {uuid: $senderProfileUuid, username: $senderProfileUsername }]->(p1)' +
        ' RETURN p1, friendRequest, p2',
      {
        sUuid: senderProfileUuid,
        rUuid: recipientProfileUuid,
        recipientProfileUuid,
        recipientProfileUsername,
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
        return true

        // driver.close()
      })
      .catch((exception) => {
        console.log(exception)
        session.close()
        return false
        // driver.close()
      })
      .finally(() => {
        return true
      })
  } catch (e) {
    return false
  } finally {
    return true
  }
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
