import {
  createDecipheriv,
  scryptSync,
  randomBytes,
  createCipheriv,
} from 'crypto'

// @ts-ignore
export function deriveKey(password) {
  const salt = randomBytes(16)

  // Using scrypt for key derivation
  const key = scryptSync(password, salt, 32)
  return { key, salt }
}

// @ts-ignore
export function encryptPassphrase(passphrase, password) {
  const { key, salt } = deriveKey(password)
  const iv = randomBytes(16)
  const cipher = createCipheriv('aes-256-gcm', key, iv)

  let encrypted = cipher.update(passphrase, 'utf8', 'hex')
  encrypted += cipher.final('hex')
  const tag = cipher.getAuthTag().toString('hex')

  return { iv: iv.toString('hex'), salt: salt.toString('hex'), tag, encrypted }
}

// @ts-ignore
export function decryptPassphrase(encryptedData, password) {
  const key = scryptSync(password, Buffer.from(encryptedData.salt, 'hex'), 32)
  const decipher = createDecipheriv(
    'aes-256-gcm',
    key,
    Buffer.from(encryptedData.iv, 'hex')
  )
  decipher.setAuthTag(Buffer.from(encryptedData.tag, 'hex'))

  let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8')
  decrypted += decipher.final('utf8')
  return decrypted
}
