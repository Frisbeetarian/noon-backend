import { generateKeyPairSync, randomBytes } from 'crypto'

export function generateUserKeys() {
  const passphrase = randomBytes(16).toString('hex')
  const { publicKey, privateKey } = generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: {
      type: 'pkcs8',
      format: 'pem',
      cipher: 'aes-256-cbc',
      passphrase,
    },
  })

  return { publicKey, privateKey, passphrase }
}
