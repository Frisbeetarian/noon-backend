import { Request, Response } from 'express'
import { Profile } from '../entities/Profile'
import {
  getFriendRequestsForProfile,
  getFriendsForProfile,
  getProfileByUsername,
  sendFriendRequest,
} from '../neo4j/neo4j_calls/neo4j_api'
import Emitters from '../socketio/emitters'
import { getIO } from '../socketio/socket'

class ProfileController {
  static async getProfile(req: Request, res: Response) {
    try {
      const { profileUuid } = req.query

      if (!profileUuid) {
        return res.status(400).json({ error: 'Missing profileUuid' })
      }

      const profile = await Profile.findOne(profileUuid)

      if (!profile) {
        return res.status(404).json({ error: 'Profile not found' })
      }

      const friendsArray = await getFriendsForProfile(profile.uuid)
      const friendRequestsArray = await getFriendRequestsForProfile(
        profile.uuid
      )

      if (friendsArray.length !== 0) {
        profile.friends = friendsArray
      } else {
        profile.friends = []
      }

      if (friendRequestsArray.length !== 0) {
        profile.friendshipRequests = friendRequestsArray
      } else {
        profile.friendshipRequests = []
      }

      return res.status(200).json(profile)
    } catch (e) {
      console.error('getProfile Error:', e)
      return res.status(500).json({ error: 'Internal server error' })
    }
  }

  static async getProfileByUsername(req: Request, res: Response) {
    try {
      const { username } = req.query

      if (!username) {
        return res.status(400).json({ error: 'Missing username' })
      }

      const profile = await getProfileByUsername(username)

      if (!profile) {
        return res.status(404).json({ error: 'Profile not found' })
      }

      return res.status(200).json(profile)
    } catch (e) {
      console.error('getProfile Error:', e)
      return res.status(500).json({ error: 'Internal server error' })
    }
  }

  static async sendFriendRequest(req: Request, res: Response) {
    try {
      const { profileUuid } = req.body

      const senderProfile = await Profile.findOne({
        where: { userId: req.session.userId },
      })

      if (!senderProfile) {
        return res.status(404).json({ error: 'Sender profile not found' })
      }

      const recipientProfile = await Profile.findOne(profileUuid)

      if (recipientProfile) {
        await sendFriendRequest(
          senderProfile?.uuid,
          senderProfile?.username,
          recipientProfile?.uuid,
          recipientProfile?.username
        )

        const io = getIO()
        const emitters = new Emitters(io)
        const content = senderProfile.username + ' wants to be your friend.'

        emitters.emitFriendRequest(
          senderProfile.uuid,
          senderProfile.username,
          recipientProfile.uuid,
          recipientProfile.username,
          content
        )

        return res.status(200).json({ message: 'Friend request sent' })
      } else {
        return res.status(404).json({ error: 'Recipient profile not found' })
      }
    } catch (e) {
      console.error('getProfile Error:', e)
      return res.status(500).json({ error: 'Internal server error' })
    }
  }
}

export default ProfileController
