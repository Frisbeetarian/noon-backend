import { Request, Response } from 'express'
import { User } from '../entities/User'
import { validateRegister } from '../utils/validateRegister'
import argon2 from 'argon2'
// import { UsernamePasswordInput } from './UsernamePasswordInput'
// import { FORGET_PASSWORD_PREFIX } from '../constants'
// import { sendEmail } from '../utils/sendEmail'
// import { v4 } from 'uuid'
import { getConnection } from 'typeorm'
import { Profile } from '../entities/Profile'
import {
  getFriendRequestsForProfile,
  getFriendsForProfile,
} from '../neo4j/neo4j_calls/neo4j_api'

class UserController {
  static async me(req: Request, res: Response) {
    if (!req.session.userId) {
      return res.status(401).json({ error: 'Not authenticated' })
    }

    // Get user from database
    let user = await getConnection()
      .getRepository(User)
      .createQueryBuilder('user')
      .select('user')
      .where('user.uuid = :id', { id: req.session.userId })
      .leftJoinAndSelect('user.profile', 'profile')
      .getOne()

    if (user && user.profile) {
      const friendsArray = await getFriendsForProfile(user?.profile?.uuid)
      const friendRequestsArray = await getFriendRequestsForProfile(
        user?.profile?.uuid
      )

      if (friendsArray.length !== 0) {
        user.profile.friends = friendsArray
      } else {
        user.profile.friends = []
      }

      if (friendRequestsArray.length !== 0) {
        user.profile.friendshipRequests = friendRequestsArray
      } else {
        user.profile.friendshipRequests = []
      }
    }

    return res.status(200).json(user)
  }

  // static async changePassword(req: Request, res: Response) {
  //   // ... logic for changePassword mutation
  // }
  //
  // static async forgotPassword(req: Request, res: Response) {
  //   // ... logic for forgotPassword mutation
  // }

  static async register(req: Request, res: Response) {
    console.log('req.body:', req.body)
    const options = req.body

    const errors = validateRegister(options)
    if (errors) {
      return res.status(400).json({ errors })
    }
    try {
      const hashedPassword = await argon2.hash(options.password)
      let user

      const result = await getConnection()
        .createQueryBuilder()
        .insert()
        .into(User)
        .values({
          username: options.username,
          password: hashedPassword,
          email: options.email,
        })
        .returning('*')
        .execute()

      user = await User.findOne(result.raw[0].uuid)
      console.log('user:', user)

      let profile = await Profile.findOne({ where: { userId: user?.uuid } })

      user = {
        ...user,
        profile: { uuid: profile?.uuid, username: profile?.username },
      }

      req.session.user = user
      req.session.userId = user.uuid

      return res.status(200).json(user)
    } catch (error) {
      if (error.code === '23505') {
        return res.status(400).json({
          errors: [
            {
              field: 'username',
              message: 'username already taken',
            },
          ],
        })
      }

      console.error('Register Error:', error)
      return res.status(500).json({ error: 'Internal server error' })
    }

    // return res.json({ user })
  }

  // static async login(req: Request, res: Response) {
  //   // ... logic for login mutation
  // }
  //
  // static async logout(req: Request, res: Response) {
  //   // ... logic for logout mutation
  // }
}

export default UserController
