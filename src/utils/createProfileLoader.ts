// import DataLoader from 'dataloader'
// import { Profile } from '../entities/Profile'
// import { Event } from '../entities/Event'
// import { EventProfile } from '../entities/EventToProfile'
// import { In } from 'typeorm'
// // import { User } from '../entities/User'
//
// const batchProfiles = async (eventIds: number[]) => {
//   const eventProfiles = await EventProfile.find({
//     join: {
//       alias: 'eventProfile',
//       innerJoinAndSelect: {
//         profile: 'eventProfile.profiles',
//       },
//     },
//     where: {
//       eventId: In(eventIds),
//     },
//   })
//
//   const eventIdToProfiles: { [key: number]: Profile[] } = {}
//
//   eventProfiles.forEach((ep) => {
//     if (ep.eventId in eventIdToProfiles) {
//       eventIdToProfiles[ep.eventId].push((ep as any).__profile__)
//     } else {
//       eventIdToProfiles[ep.eventId] = [(ep as any).__profile__]
//     }
//   })
//
//   return eventIds.map((eventId) => eventIdToProfiles[eventId])
// }
//
// // export const createProfileLoader = () => new DataLoader(batchProfiles)
// // new DataLoader<{ profiles: Profile[] }, Profile | null>(async (keys) => {
// //   const profiles = await Profile.findByIds(keys as any)
// //   const profilesIdsToEvent: Record<string, Profile> = {}
// //   console.log('event in loader: ', profiles)
// //
// //   // profiles.forEach((profile) => {
// //   //   // profilesIdsToEvent[`${profile.events}`] = profile
// //   // })
// //
// //   return keys.map((key) => profilesIdsToEvent[`${key.profiles}`])
// // })
