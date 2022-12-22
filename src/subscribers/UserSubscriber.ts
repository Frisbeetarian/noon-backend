import {
  EntitySubscriberInterface,
  EventSubscriber,
  getConnection,
  InsertEvent,
} from 'typeorm'
import { User } from '../entities/User'
import { Profile } from '../entities/Profile'
import { createUserAndAssociateWithProfile } from '../neo4j/neo4j_calls/neo4j_api'

const rpcClient = require('../utils/brokerInitializer')

@EventSubscriber()
export class UserSubscriber implements EntitySubscriberInterface<User> {
  listenTo() {
    return User
  }

  async afterInsert(event: InsertEvent<User>) {
    try {
      const profile = await getConnection()
        .createQueryBuilder()
        .insert()
        .into(Profile)
        .values({
          username: event.entity.username,
          userId: event.entity.uuid,
          name: event.entity.username,
        })
        .returning('*')
        .execute()

      const user = await User.findOne(event.entity.uuid)
      if (user) {
        user.profile = profile.raw[0]
        user.profileId = profile.raw[0].uuid
        await getConnection().manager.save(user)

        await createUserAndAssociateWithProfile(user, profile.raw[0])
        await rpcClient.search().indexProfile({ profile })
        // await rpcClient.search().indexProfile({
        //   profile: {
        //     uuid: profile.raw[0].uuid,
        //     username: profile.raw[0].username,
        //     name: profile.raw[0].name,
        //     userId: profile.raw[0].userId,
        //     createdAt: profile.raw[0].createdAt,
        //     updatedAt: profile.raw[0].updatedAt,
        //     // user: {
        //     //   uuid: user.uuid,
        //     //   username: user.username,
        //     //   name: profile.raw[0].name,
        //     // },
        //     // friends: [{ uuid: '1', username: 'test' }],
        //     // friendshipRequests: [{ uuid: '1', username: 'test' }],
        //   },
        // })
      }
    } catch (e) {
      console.log('error in listener:', e)
    }
  }
}
