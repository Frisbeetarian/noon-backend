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

      const user = await User.findOne({ where: { uuid: event.entity.uuid } })

      if (user) {
        user.profile = profile.raw[0]
        user.profileUuid = profile.raw[0].uuid

        await getConnection().manager.save(user)

        await createUserAndAssociateWithProfile(user, profile.raw[0])
        await rpcClient.search().indexProfile({ profile })
      }
    } catch (e) {
      console.log('error in listener:', e)
    }
  }
}
