import nacl from 'tweetnacl'
import { encodeBase64, decodeBase64, encodeUTF8, decodeUTF8 } from 'tweetnacl-util'
import { scrypt } from 'scrypt-js'

// Generate a new key pair for user
export function generateKeyPair() {
  const keyPair = nacl.box.keyPair()
  return {
    publicKey: encodeBase64(keyPair.publicKey),
    secretKey: encodeBase64(keyPair.secretKey)
  }
}

// Derive a key from password using scrypt
async function deriveKey(password, salt) {
  const passwordBuffer = new TextEncoder().encode(password)
  const saltBuffer = new TextEncoder().encode(salt)

  // scrypt parameters (N=2^14, r=8, p=1, keyLen=32)
  const derivedKey = await scrypt(passwordBuffer, saltBuffer, 16384, 8, 1, 32)
  return new Uint8Array(derivedKey)
}

// Encrypt private key with password
export async function encryptPrivateKey(privateKey, password) {
  const salt = encodeBase64(nacl.randomBytes(16))
  const key = await deriveKey(password, salt)
  const nonce = nacl.randomBytes(nacl.secretbox.nonceLength)
  const privateKeyBytes = decodeBase64(privateKey)

  const encrypted = nacl.secretbox(privateKeyBytes, nonce, key)

  return JSON.stringify({
    salt,
    nonce: encodeBase64(nonce),
    encrypted: encodeBase64(encrypted)
  })
}

// Decrypt private key with password
export async function decryptPrivateKey(encryptedData, password) {
  try {
    const { salt, nonce, encrypted } = JSON.parse(encryptedData)
    const key = await deriveKey(password, salt)

    const decrypted = nacl.secretbox.open(
      decodeBase64(encrypted),
      decodeBase64(nonce),
      key
    )

    if (!decrypted) {
      throw new Error('Decryption failed')
    }

    return encodeBase64(decrypted)
  } catch (err) {
    throw new Error('Invalid password or corrupted data')
  }
}

// Encrypt message for private chat (using shared secret)
export function encryptMessage(message, senderSecretKey, receiverPublicKey) {
  const nonce = nacl.randomBytes(nacl.box.nonceLength)
  const messageBytes = decodeUTF8(message)

  const encrypted = nacl.box(
    messageBytes,
    nonce,
    decodeBase64(receiverPublicKey),
    decodeBase64(senderSecretKey)
  )

  return {
    encryptedContent: encodeBase64(encrypted),
    nonce: encodeBase64(nonce)
  }
}

// Decrypt message from private chat
export function decryptMessage(encryptedContent, nonce, senderPublicKey, receiverSecretKey) {
  try {
    const decrypted = nacl.box.open(
      decodeBase64(encryptedContent),
      decodeBase64(nonce),
      decodeBase64(senderPublicKey),
      decodeBase64(receiverSecretKey)
    )

    if (!decrypted) {
      return '[Failed to decrypt]'
    }

    return encodeUTF8(decrypted)
  } catch (err) {
    return '[Failed to decrypt]'
  }
}

// Generate a symmetric key for group chat
export function generateGroupKey() {
  return encodeBase64(nacl.randomBytes(nacl.secretbox.keyLength))
}

// Encrypt group key for a member (using their public key)
export function encryptGroupKey(groupKey, memberPublicKey, mySecretKey) {
  const nonce = nacl.randomBytes(nacl.box.nonceLength)
  const groupKeyBytes = decodeBase64(groupKey)

  const encrypted = nacl.box(
    groupKeyBytes,
    nonce,
    decodeBase64(memberPublicKey),
    decodeBase64(mySecretKey)
  )

  return JSON.stringify({
    nonce: encodeBase64(nonce),
    encrypted: encodeBase64(encrypted)
  })
}

// Decrypt group key
export function decryptGroupKey(encryptedData, senderPublicKey, mySecretKey) {
  try {
    const { nonce, encrypted } = JSON.parse(encryptedData)

    const decrypted = nacl.box.open(
      decodeBase64(encrypted),
      decodeBase64(nonce),
      decodeBase64(senderPublicKey),
      decodeBase64(mySecretKey)
    )

    if (!decrypted) {
      throw new Error('Decryption failed')
    }

    return encodeBase64(decrypted)
  } catch (err) {
    throw new Error('Failed to decrypt group key')
  }
}

// Encrypt message with group key (symmetric)
export function encryptGroupMessage(message, groupKey) {
  const nonce = nacl.randomBytes(nacl.secretbox.nonceLength)
  const messageBytes = decodeUTF8(message)

  const encrypted = nacl.secretbox(
    messageBytes,
    nonce,
    decodeBase64(groupKey)
  )

  return {
    encryptedContent: encodeBase64(encrypted),
    nonce: encodeBase64(nonce)
  }
}

// Decrypt message with group key
export function decryptGroupMessage(encryptedContent, nonce, groupKey) {
  try {
    const decrypted = nacl.secretbox.open(
      decodeBase64(encryptedContent),
      decodeBase64(nonce),
      decodeBase64(groupKey)
    )

    if (!decrypted) {
      return '[Failed to decrypt]'
    }

    return encodeUTF8(decrypted)
  } catch (err) {
    return '[Failed to decrypt]'
  }
}

// Security emoji set - 64 distinct, easy to compare emojis
const SECURITY_EMOJIS = [
  '🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼',
  '🐨', '🐯', '🦁', '🐮', '🐷', '🐸', '🐵', '🐔',
  '🦄', '🐝', '🦋', '🐢', '🐙', '🦀', '🐬', '🐳',
  '🌸', '🌺', '🌻', '🌹', '🌴', '🌵', '🍀', '🍁',
  '🍎', '🍊', '🍋', '🍇', '🍓', '🍒', '🥝', '🍑',
  '🌙', '⭐', '🌈', '☀️', '❄️', '🔥', '💧', '🌊',
  '🎈', '🎀', '🎁', '🎨', '🎭', '🎪', '🎯', '🎲',
  '🚀', '✈️', '🚂', '⛵', '🏠', '🏰', '⛰️', '🗽'
]

// Generate security verification emojis from two public keys
// Both users will see the same emojis if their keys are authentic
export function generateSecurityEmojis(publicKey1, publicKey2) {
  // Sort keys to ensure same order on both devices
  const sortedKeys = [publicKey1, publicKey2].sort()
  const combined = sortedKeys[0] + sortedKeys[1]

  // Hash the combined keys using nacl's hash function
  const combinedBytes = decodeUTF8(combined)
  const hash = nacl.hash(combinedBytes)

  // Take first 8 bytes of hash and map to emojis
  const emojis = []
  for (let i = 0; i < 8; i++) {
    const index = hash[i] % SECURITY_EMOJIS.length
    emojis.push(SECURITY_EMOJIS[index])
  }

  return emojis.join('')
}

// Generate a fingerprint from a single public key (for display)
export function generateKeyFingerprint(publicKey) {
  const keyBytes = decodeBase64(publicKey)
  const hash = nacl.hash(keyBytes)

  // Convert first 16 bytes to hex groups
  const groups = []
  for (let i = 0; i < 16; i += 2) {
    const hex = ((hash[i] << 8) | hash[i + 1]).toString(16).toUpperCase().padStart(4, '0')
    groups.push(hex)
  }

  return groups.join(' ')
}
