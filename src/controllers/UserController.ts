// @ts-nocheck
import { Request, Response } from 'express'

import { User } from '../entities/User'
import { validateRegister } from '../utils/validateRegister'
import argon2 from 'argon2'
import { getConnection } from 'typeorm'
import { Profile } from '../entities/Profile'
import {
  checkFriendship,
  getFriendRequestsForProfile,
  getFriendsForProfile,
} from '../neo4j/neo4j_calls/neo4j_api'
import { generateUserKeys } from '../utils/generateUserKeys'
import { encryptPassphrase } from '../utils/passphraseManager'

class UserController {
  static async me(req: Request, res: Response) {
    try {
      if (!req.session.userId) {
        return res.status(401).json({ error: 'Not authenticated' })
      }

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
      } else {
        return res.status(401).json({ error: 'Not authenticated' })
      }

      return res.status(200).json(user)
    } catch (e) {
      console.error('Register Error:', e.message)
      return res.status(500).json({ error: 'Internal server error' })
    }
  }

  // static async changePassword(req: Request, res: Response) {
  //   // ... logic for changePassword mutation
  // }
  //
  // static async forgotPassword(req: Request, res: Response) {
  //   // ... logic for forgotPassword mutation
  // }

  static async register(req: Request, res: Response) {
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
          publicKey: options.publicKey,
        })
        .returning('*')
        .execute()

      user = await User.findOne({ where: { uuid: result.raw[0].uuid } })

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
        return res.status(409).json({
          errors: [
            {
              field: 'username',
              message: 'username or email already taken.',
            },
          ],
        })
      }

      console.error('Register Error:', error.message)
      return res.status(500).json({ error: 'Internal server error' })
    }
  }

  static async login(req: Request, res: Response) {
    try {
      const { usernameOrEmail, password, rememberMe } = req.body

      let user = await User.findOne(
        usernameOrEmail.includes('@')
          ? { where: { email: usernameOrEmail } }
          : { where: { username: usernameOrEmail } }
      )

      if (!user) {
        return res.status(401).json({
          errors: [
            {
              field: 'usernameOrEmail',
              message: 'Invalid credentials.',
            },
          ],
        })
      }

      const valid = await argon2.verify(user.password, password)

      if (!valid) {
        return res.status(401).json({
          errors: [
            {
              field: 'usernameOrEmail',
              message: 'Invalid credentials.',
            },
          ],
        })
      }

      let profile = await Profile.findOne({ where: { userId: user?.uuid } })

      user = {
        ...user,
        profile: { uuid: profile?.uuid, usernameOrEmail: profile?.username },
      }

      if (rememberMe) {
        req.session.cookie.maxAge = 90 * 24 * 60 * 60 * 1000 // 90 days
      }

      req.session.user = user
      req.session.userId = user.uuid

      return res.status(200).json(user)
    } catch (e) {
      console.error('Login Error:', e.message)
      return res.status(500).json({ error: 'Internal server error' })
    }
  }

  static async logout(req: Request, res: Response) {
    req.session.destroy((err) => {
      res.clearCookie('qid')
      if (err) {
        console.log(err.message)
        return res.status(500).json({ error: 'Failed to logout' })
      }
      return res.status(200).json({ message: 'Logged out successfully' })
    })
  }

  static async getFriendsPublicKey(req: Request, res: Response) {
    if (!req.session.userId) {
      return res.status(401).json({ error: 'Not authenticated' })
    }

    const senderProfile = await Profile.findOne({
      where: { userId: req.session.userId },
    })

    if (!senderProfile) {
      return res.status(404).json({ error: 'Profile not found.' })
    }

    try {
      const friendsArray = await getFriendsForProfile(senderProfile.uuid)

      if (friendsArray.length === 0) {
        return res.status(404).json({ error: 'No friends found.' })
      }

      const publicKeys = await Promise.all(
        friendsArray.map(async (friend) => {
          const friendUser = await User.findOne({
            where: { profileUuid: friend.uuid },
          })

          if (!friendUser) {
            console.error(`User not found for UUID: ${friend.uuid}`)
            return null
          }

          return { uuid: friend.uuid, publicKey: friendUser.publicKey }
        })
      )

      const filteredPublicKeys = publicKeys.filter((pk) => pk !== null)

      return res.status(200).json(filteredPublicKeys)
    } catch (error) {
      console.error('Error fetching public keys:', error.message)
      return res.status(500).json({ error: 'Internal server error' })
    }
  }

  static async getPublicKeyByProfileUuid(req: Request, res: Response) {
    if (!req.session.userId) {
      return res.status(401).json({ error: 'Not authenticated' })
    }

    const senderProfile = await Profile.findOne({
      where: { userId: req.session.userId },
    })

    if (!senderProfile) {
      return res.status(404).json({ error: 'Profile not found.' })
    }

    try {
      const { uuid } = req.params
      const recipientProfile = await Profile.findOne({
        where: { uuid },
      })

      if (recipientProfile) {
        const areFriends = await checkFriendship(
          senderProfile.uuid,
          recipientProfile.uuid
        )

        if (!areFriends) {
          return res.status(401).json({ error: 'Not authorized' })
        }

        return res.json({
          uuid: recipientProfile.uuid,
          publicKey: recipientProfile.user?.publicKey,
        })
      } else {
        return res.status(404).json({ error: 'Profile not found.' })
      }
    } catch (error) {
      console.error('Error fetching public key:', error.message)
      return res.status(500).json({ error: 'Internal server error' })
    }
  }

  static async validatePassword(req: Request, res: Response) {
    if (!req.session.userId) {
      return res.status(401).json({ error: 'Not authenticated' })
    }

    try {
      const { password } = req.body
      const user = await User.findOne({ where: { uuid: req.session.userId } })

      if (!user) {
        return res.status(404).json({ error: 'User not found.' })
      }

      const valid = await argon2.verify(user.password, password)

      return res.status(200).json({ valid })
    } catch (error) {
      console.error('Error validating password:', error.message)
      return res.status(500).json({ error: 'Internal server error' })
    }
  }
}

export default UserController
