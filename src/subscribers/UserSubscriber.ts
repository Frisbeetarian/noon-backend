import {
  EntitySubscriberInterface,
  EventSubscriber,
  getConnection,
  InsertEvent,
} from 'typeorm'
import { User } from '../entities/User'
import { Profile } from '../entities/Profile'
import { create_user } from '../neo4j/neo4j_calls/neo4j_api'

@EventSubscriber()
export class UserSubscriber implements EntitySubscriberInterface<User> {
  listenTo() {
    return User
  }

  async afterInsert(event: InsertEvent<User>) {
    const profile = await getConnection()
      .createQueryBuilder()
      .insert()
      .into(Profile)
      .values({
        username: event.entity.username,
        userId: event.entity.id,
      })
      .returning('*')
      .execute()

    const user = await User.findOne(event.entity.id)

    if (user) {
      user.profile = profile.raw[0]
      await getConnection().manager.save(user)

      await create_user(user.username)
    }
  }
}
