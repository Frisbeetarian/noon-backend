// import {
//   EntitySubscriberInterface,
//   EventSubscriber,
//   getConnection,
//   InsertEvent,
// } from 'typeorm'
// import { Profile } from '../models/Profile'
// import { User } from '../models/User'
// import { Post } from '../models/Post'
//
// @EventSubscriber()
// export class UserSubscriber implements EntitySubscriberInterface<Profile> {
//   listenTo() {
//     return Profile
//   }
//
//   async afterInsert(event: InsertEvent<Profile>) {
//     // console.log('subscribers launched')
//     // await getConnection()
//     //   .createQueryBuilder()
//     //   .update(User)
//     //   .set({ profileId: event.entity.id })
//     //   .where('id = :id', {
//     //     id: event.entity.userId,
//     //   })
//     //   .returning('*')
//     //   .execute()
//     // await getConnection()
//     //   .getRepository(User)
//     //   .createQueryBuilder('user')
//     //   .update<User>(User, { profileId: event.entity.id })
//     //   .where('user.id = :id', { id: event.entity.userId })
//     //   .returning(['id', 'email'])
//     //   .updateEntity(true)
//     //   .execute()
//   }
// }
