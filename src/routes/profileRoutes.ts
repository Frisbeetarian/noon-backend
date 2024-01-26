import express from 'express'
import UserController from '../controllers/UserController'

const profileRouter = express.Router()

profileRouter.get('/me', UserController.me)
// userRouter.post('/change-password', UserController.changePassword)
// userRouter.post('/forgot-password', UserController.forgotPassword)
// userRouter.post('/register', UserController.register)
// userRouter.post('/login', UserController.login)
// userRouter.post('/logout', UserController.logout)

export default profileRouter
