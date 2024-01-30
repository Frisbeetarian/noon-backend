// @ts-nocheck
import express from 'express'
import UserController from '../controllers/UserController'
import SearchController from '../controllers/SearchController'
const searchRouter = express.Router()

searchRouter.post('/', SearchController.getProfilesByUsername)
// searchRouter.post('/:profileUuid', SearchController.register)
export default searchRouter
