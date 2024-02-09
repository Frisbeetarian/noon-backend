import express from 'express'
import multer from 'multer'
import path from 'path'

import MessageController from '../controllers/MessageController'

const messageRouter = express.Router()

const allowedExtensions = /\.(jpg|jpeg|png|doc|docx|pdf|ogg)$/i
const fileSizeLimit = 1 * 1024 * 1024 // 1MB

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: fileSizeLimit },
  fileFilter: (req, file, cb) => {
    if (!allowedExtensions.test(path.extname(file.originalname))) {
      // @ts-ignore
      req.fileValidationError = 'Forbidden extension'
      // @ts-ignore
      return cb(null, false, req.fileValidationError)
    }
    cb(null, true)
  },
})

messageRouter.get(
  '/:conversationUuid',
  MessageController.getMessagesForConversation
)

messageRouter.post(
  '/uploadFile',
  upload.single('file'),
  // @ts-ignore
  (req, res, next) => {
    // @ts-ignore
    if (req.fileValidationError) {
      // @ts-ignore
      return res.status(400).json({ error: req.fileValidationError })
    } else if (!req.file) {
      return res.status(400).json({ error: 'No file provided' })
    } else if (req.file.size > fileSizeLimit) {
      // This check is redundant due to multer's limits, but included for clarity
      return res.status(400).json({ error: 'File is too large' })
    }
    next()
  },
  MessageController.saveFile
)

messageRouter.post(
  '/uploadVoiceRecording',
  upload.single('file'),
  // @ts-ignore
  (req, res, next) => {
    // @ts-ignore
    if (req.fileValidationError) {
      // @ts-ignore
      return res.status(400).json({ error: req.fileValidationError })
    } else if (!req.file) {
      return res.status(400).json({ error: 'No file provided' })
    } else if (req.file.size > fileSizeLimit) {
      // This check is redundant due to multer's limits, but included for clarity
      return res.status(400).json({ error: 'File is too large' })
    }
    next()
  },
  MessageController.saveVoiceRecording
)
messageRouter.post('/groupMessages', MessageController.handleGroupMessage)
messageRouter.post('/', MessageController.handleMessage)

messageRouter.delete('/', MessageController.deleteMessage)

export default messageRouter
