import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { api } from '../utils/api.js'
import { connectSocket, disconnectSocket } from '../utils/socket.js'
import {
  generateKeyPair,
  encryptPrivateKey,
  decryptPrivateKey
} from '../utils/crypto.js'

export const useUserStore = defineStore('user', () => {
  const user = ref(null)
  const token = ref(localStorage.getItem('token'))
  const privateKey = ref(null) // In memory only, never persisted

  const isLoggedIn = computed(() => !!token.value && !!user.value)

  async function register(username, password) {
    // Generate key pair
    const keyPair = generateKeyPair()

    // Encrypt private key with password
    const encryptedPrivateKey = await encryptPrivateKey(keyPair.secretKey, password)

    // Register
    const result = await api.register({
      username,
      password,
      publicKey: keyPair.publicKey,
      encryptedPrivateKey
    })

    // Store token and user
    token.value = result.token
    user.value = result.user
    privateKey.value = keyPair.secretKey
    localStorage.setItem('token', result.token)

    // Connect socket
    connectSocket(result.token)

    return result
  }

  async function login(username, password) {
    const result = await api.login({ username, password })

    // Decrypt private key
    const decryptedKey = await decryptPrivateKey(result.user.encryptedPrivateKey, password)

    // Store
    token.value = result.token
    user.value = result.user
    privateKey.value = decryptedKey
    localStorage.setItem('token', result.token)

    // Connect socket
    connectSocket(result.token)

    return result
  }

  async function restoreSession(password) {
    if (!token.value) return false

    try {
      const userData = await api.getMe()

      // Need password to decrypt private key
      const decryptedKey = await decryptPrivateKey(userData.encryptedPrivateKey, password)

      user.value = userData
      privateKey.value = decryptedKey

      // Connect socket
      connectSocket(token.value)

      return true
    } catch (err) {
      logout()
      return false
    }
  }

  function logout() {
    user.value = null
    token.value = null
    privateKey.value = null
    localStorage.removeItem('token')
    disconnectSocket()
  }

  async function changePassword(oldPassword, newPassword) {
    // Re-encrypt private key with new password
    const newEncryptedPrivateKey = await encryptPrivateKey(privateKey.value, newPassword)

    // Send to server
    await api.changePassword({
      oldPassword,
      newPassword,
      newEncryptedPrivateKey
    })

    return true
  }

  return {
    user,
    token,
    privateKey,
    isLoggedIn,
    register,
    login,
    restoreSession,
    logout,
    changePassword
  }
})
