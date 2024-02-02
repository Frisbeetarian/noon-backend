import express from 'express'
import ProfileController from '../controllers/ProfileController'

const profileRouter = express.Router()

profileRouter.get('/getProfile', ProfileController.getProfile)
profileRouter.get(
  '/getProfileByUsername',
  ProfileController.getProfileByUsername
)
profileRouter.post('/sendFriendRequest', ProfileController.sendFriendRequest)
profileRouter.post(
  '/cancelFriendRequest',
  ProfileController.cancelFriendRequest
)

profileRouter.post(
  '/acceptFriendRequest',
  ProfileController.acceptFriendRequest
)

profileRouter.post('/unfriend', ProfileController.unfriend)

profileRouter.get('/getFriendsRequests', ProfileController.getFriendRequests)
export default profileRouter
