// @ts-nocheck
import DataLoader from 'dataloader'
import { User } from '../entities/User'

export const createUserLoader = () =>
  new DataLoader<number, User>(async (userIds: string[]) => {
    const users = await User.findByIds(userIds as string[])
    const userIdToUser: Record<number, User> = {}

    users.forEach((u) => {
      userIdToUser[u.uuid] = u
    })

    return userIds.map((userId) => userIdToUser[userId])
  })
