import express from 'express'
import ProfileController from '../controllers/ProfileController'

const profileRouter = express.Router()

profileRouter.get('/getProfile', ProfileController.getProfile)
profileRouter.get(
  '/getProfileByUsername',
  ProfileController.getProfileByUsername
)
profileRouter.post('/sendFriendRequest', ProfileController.sendFriendRequest)

export default profileRouter
