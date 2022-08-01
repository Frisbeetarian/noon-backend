import {
  EntitySubscriberInterface,
  EventSubscriber,
  getConnection,
  InsertEvent,
} from 'typeorm'
import { User } from '../entities/User'
import { Profile } from '../entities/Profile'

@EventSubscriber()
export class UserSubscriber implements EntitySubscriberInterface<User> {
  listenTo() {
    return User
  }

  async afterInsert(event: InsertEvent<User>) {
    // console.log('subscribers launched')
    // console.log('event entity: ', event.entity.username)
    const profile = await getConnection()
      .createQueryBuilder()
      .insert()
      .into(Profile)
      .values({
        username: event.entity.username,
        // userId: event.entity.id,
      })
      .returning('*')
      .execute()

    const user = await User.findOne(event.entity.id)
    user?.profile = profile.raw[0]
    await getConnection().manager.save(user)
  }
}
