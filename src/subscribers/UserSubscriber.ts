import {
  EntitySubscriberInterface,
  EventSubscriber,
  getConnection,
  InsertEvent,
} from 'typeorm'
import { User } from '../entities/User'
import { getConnection } from 'typeorm'
import { Profile } from '../entities/Profile'

@EventSubscriber()
export class UserSubscriber implements EntitySubscriberInterface<User> {
  listenTo() {
    return User
  }

  async afterInsert(event: InsertEvent<User>) {
    console.log('subscribers launched')
    // console.log(event)

    const result = await getConnection()
      .createQueryBuilder()
      .insert()
      .into(Profile)
      .values({
        username: event.entity.username,
      })
      .returning('*')
      .execute()
  }
}
