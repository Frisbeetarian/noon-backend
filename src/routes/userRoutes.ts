import express from 'express'
import UserController from '../controllers/UserController'
const userRouter = express.Router()

userRouter.get('/me', UserController.me)
// userRouter.post('/change-password', UserController.changePassword)
// userRouter.post('/forgot-password', UserController.forgotPassword)
userRouter.post('/register', UserController.register)
userRouter.post('/login', UserController.login)
userRouter.post('/logout', UserController.logout)
userRouter.get('/publicKeys', UserController.getFriendsPublicKey)

export default userRouter
