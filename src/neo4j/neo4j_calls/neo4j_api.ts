// @ts-nocheck
import { parse, stringify, toJSON, fromJSON } from 'flatted'
import { getNeo4jConnection } from '../driver'

export const getProfiles = async function (loggedInProfileUuid) {
  const session = getNeo4jConnection().session()
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

      results.records.map((record, index) => {
        const profile = profiles.find(
          ({ uuid }) => uuid === record._fields[1]?.properties.uuid
        )

        if (record._fields[0]?.properties !== undefined) {
          profile['friends'].push(record._fields[0]?.properties)
        }

        // if (record._fields[0]?.properties.uuid === loggedInProfileUuid) {
        //   profiles.splice(index, 1)
        // }
      })
    })
    .catch((error) => {
      console.log('error:', error)
    })
    .then(() => {
      session.close()
    })

  // console.log('profiles:', profiles)

  return profiles
}

export const getFriendsForProfile = async function (profileUuid) {
  const session = getNeo4jConnection().session()

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

export const checkFriendship = async function (profile1Uuid, profile2Uuid) {
  const session = getNeo4jConnection().session()

  let check = null
  await session
    .run(
      'MATCH (p1:Profile {uuid: $profile1Uuid})' +
        'MATCH (p2:Profile {uuid: $profile2Uuid})' +
        // ' OPTIONAL MATCH (p)-[friendRequests:FRIEND_REQUEST]->(l)' +
        // ' OPTIONAL MATCH (p)<-[reverseFriendRequest:FRIEND_REQUEST]-(l)' +
        ' return [(p1)-[f:FRIENDS]-(p2) | f] AS friends',
      {
        profile1Uuid,
        profile2Uuid,
      }
    )
    .then((results) => {
      // console.log('check friendship results:', results)
      // console.log('check friendship results:', results.records)
      check = results.records[0]._fields[0].length > 0
      // console.log('check friendship results:', results.records[0]._fields[0])
    })
    .catch((error) => {
      console.log(error)
    })
    .then(() => {
      session.close()
    })

  return check
}

export const getFriendRequestsForProfile = async function (profileUuid) {
  const session = getNeo4jConnection().session()

  let friendRequests = []
  // 'MATCH (p:Profile {uuid: $profileUuid}) RETURN [(p)-[fr:FRIEND_REQUEST]->() | fr] AS outgoingFriendRequests, [(p)<-[fr:FRIEND_REQUEST]-() | fr] AS incomingFriendRequests',

  await session
    .run(
      'MATCH (p:Profile {uuid: $profileUuid})' +
        // ' OPTIONAL MATCH (p)-[friendRequests:FRIEND_REQUEST]->(l)' +
        // ' OPTIONAL MATCH (p)<-[reverseFriendRequest:FRIEND_REQUEST]-(l)' +
        ' return [(p)-[fr:FRIEND_REQUEST]->() | fr] AS outgoingFriendRequests,' +
        '       [(p)<-[fr:FRIEND_REQUEST]-(l) | l] AS l',
      {
        profileUuid,
      }
    )
    .then((results) => {
      // console.log('results.records:', results.records)

      results.records.forEach((record) => {
        // console.log('results.records fields[0]:', record._fields[1])

        if (record._fields[0]) {
          record._fields[0].forEach((outgoingFriendRequest) => {
            outgoingFriendRequest.properties = {
              ...outgoingFriendRequest.properties,
              reverse: false,
            }
            friendRequests.push(outgoingFriendRequest.properties)
          })
        }

        if (record._fields[1]) {
          record._fields[1].forEach((incomingFriendRequests) => {
            incomingFriendRequests.properties = {
              ...incomingFriendRequests.properties,
              reverse: true,
            }
            friendRequests.push(incomingFriendRequests.properties)
          })
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
  const session = getNeo4jConnection().session()

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
          // console.log(record)
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

  const session = getNeo4jConnection().session()

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
          // console.log(record)
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
  const session = getNeo4jConnection().session()

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
        result.records.forEach(async (record) => {
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
  } catch (e) {
    console.log(e)
  }
}

export const refuseFriendRequest = async function (
  senderProfileUuid,
  senderProfileUsername,
  recipientProfileUuid,
  recipientProfileUsername
) {
  const session = getNeo4jConnection().session()

  const tx = session.beginTransaction()

  console.log('refuse friend request: ', {
    senderProfileUuid,
    senderProfileUsername,
    recipientProfileUuid,
    recipientProfileUsername,
  })
  try {
    tx.run(
      'Match (p1:Profile {uuid: $sUuid}) ' +
        ' Match (p2:Profile {uuid: $rUuid})' +
        ' Match (p1)-[fr:FRIEND_REQUEST]-(p2)' +
        ' DELETE fr' +
        ' RETURN p1, fr, p2',
      {
        sUuid: senderProfileUuid,
        rUuid: recipientProfileUuid,
      }
    )
      .then((result) => {
        console.log(result)

        result.records.forEach(async (record) => {
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
  } catch (e) {
    console.log(e)
  }
}

export const cancelFriendRequest = async function (
  senderProfileUuid,
  senderProfileUsername,
  recipientProfileUuid,
  recipientProfileUsername
) {
  const session = getNeo4jConnection().session()

  const tx = session.beginTransaction()

  console.log('cancel friend request: ', {
    senderProfileUuid,
    senderProfileUsername,
    recipientProfileUuid,
    recipientProfileUsername,
  })
  try {
    tx.run(
      'Match (p1:Profile {uuid: $sUuid}) ' +
        ' Match (p2:Profile {uuid: $rUuid})' +
        ' Match (p1)-[fr:FRIEND_REQUEST]-(p2)' +
        ' DELETE fr' +
        ' RETURN p1, fr, p2',
      {
        sUuid: senderProfileUuid,
        rUuid: recipientProfileUuid,
      }
    )
      .then((result) => {
        console.log(result)

        result.records.forEach(async (record) => {
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
  } catch (e) {
    console.log(e)
  }
}

export const unfriend = async function (
  initiatorProfileUuid,
  initiatorProfileUsername,
  targetProfileUuid,
  targetProfileUsername
) {
  const session = getNeo4jConnection().session()

  const tx = session.beginTransaction()

  console.log('cancel friend request: ', {
    initiatorProfileUuid,
    initiatorProfileUsername,
    targetProfileUuid,
    targetProfileUsername,
  })
  try {
    tx.run(
      'Match (p1:Profile {uuid: $iUuid}) ' +
        ' Match (p2:Profile {uuid: $tUuid})' +
        ' Match (p1)-[f:FRIENDS]-(p2)' +
        ' DELETE f' +
        ' RETURN p1, f, p2',
      {
        iUuid: initiatorProfileUuid,
        tUuid: targetProfileUuid,
      }
    )
      .then((result) => {
        console.log(result)

        result.records.forEach(async (record) => {
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
  } catch (e) {
    console.log(e)
  }
}
