// @ts-nocheck

// const express = require('express')
import express from 'express'
const router = express.Router()

import multer from 'multer'
const upload = multer()
const rpcClient = require('../utils/brokerInitializer')
import { Message } from '../entities/Message'
import { Profile } from '../entities/Profile'
import { Conversation } from '../entities/Conversation'
import { getConnection } from 'typeorm'

// const neo4j_calls = require('./../neo4j_calls/neo4j_api')
// import { get_num_nodes, create_user } from '../neo4j_calls/neo4j_api'

// router.get('/', async function (req, res, next) {
//   res.status(200).send('Root Response from :4020/test_api')
//   return 700000
// })

// router.get('/neo4j_get', async function (req, res, next) {
//   let result = await get_num_nodes()
//   console.log('RESULT IS', result)
//   res.status(200).send({ result }) //Can't send just a Number; encapsulate with {} or convert to String.
//   return { result }
// })

router.post(
  '/upload_image',
  upload.single('file'),
  async function (req, res, next) {
    let { image } = req.body

    console.log('conversation uuid in upload image:', req.body)

    const response = await rpcClient.media().sendImage({
      task: 'upload-image',
      image: req.file,
    })

    console.log('MEDIA RESPONSE in upload image:', response)
    const conversation = await Conversation.findOne(req.body.conversationUuid)
    const sender = await Profile.findOne(req.body.senderUuid)
    const messageRepository = getConnection().getRepository(Message)

    let type = 'image'
    let src = response
    let saveMessage = new Message(conversation, sender, response, type, src)

    const message = await messageRepository.save(saveMessage)

    return res.status(200).send(message)
    //   return res.status(200).send('User named ' + string + ' created')
  }
)

router.post(
  '/upload_audio_recording',
  upload.single('file'),
  async function (req, res, next) {
    let { image } = req.body

    console.log('conversation uuid in upload audio recording:', req.file)

    const response = await rpcClient.media().sendAudioRecording({
      task: 'upload-audio-recording',
      file: req.file,
    })

    console.log('MEDIA RESPONSE in upload audio recording:', response)
    const conversation = await Conversation.findOne(req.body.conversationUuid)
    const sender = await Profile.findOne(req.body.senderUuid)
    const messageRepository = getConnection().getRepository(Message)

    let type = 'audio'
    let src = response
    let saveMessage = new Message(conversation, sender, response, type, src)

    const message = await messageRepository.save(saveMessage)

    return res.status(200).send(message)
    //   return res.status(200).send('User named ' + string + ' created')
  }
)

// module.exports = router
export default router
