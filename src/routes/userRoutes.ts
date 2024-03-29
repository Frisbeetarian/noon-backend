import express from 'express'
import UserController from '../controllers/UserController'
const userRouter = express.Router()

userRouter.get('/me', UserController.me)
// userRouter.post('/change-password', UserController.changePassword)
// userRouter.post('/forgot-password', UserController.forgotPassword)
userRouter.post('/register', UserController.register)
userRouter.post('/login', UserController.login)
userRouter.post('/logout', UserController.logout)
userRouter.post('/validatePassword', UserController.validatePassword)
userRouter.get('/publicKeys', UserController.getFriendsPublicKey)
userRouter.get('/publicKeys/:uuid', UserController.getPublicKeyByProfileUuid)

export default userRouter
