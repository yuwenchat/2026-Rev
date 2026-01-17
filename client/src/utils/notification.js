// Browser Notification Utility

let notificationPermission = Notification?.permission || 'denied'

// Check if notifications are supported
export function isNotificationSupported() {
  return 'Notification' in window
}

// Get current permission status
export function getPermissionStatus() {
  if (!isNotificationSupported()) return 'unsupported'
  return Notification.permission
}

// Request notification permission
export async function requestPermission() {
  if (!isNotificationSupported()) {
    return 'unsupported'
  }

  if (Notification.permission === 'granted') {
    notificationPermission = 'granted'
    return 'granted'
  }

  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission()
    notificationPermission = permission
    return permission
  }

  return 'denied'
}

// Send a notification
export function sendNotification(title, options = {}) {
  if (!isNotificationSupported()) return null
  if (Notification.permission !== 'granted') return null

  // Don't send if document is focused
  if (document.hasFocus() && !options.force) return null

  const defaultOptions = {
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    tag: options.tag || 'yuwen-chat',
    renotify: true,
    requireInteraction: false,
    silent: false,
    ...options
  }

  try {
    const notification = new Notification(title, defaultOptions)

    // Auto close after 5 seconds
    setTimeout(() => {
      notification.close()
    }, 5000)

    // Handle click
    notification.onclick = () => {
      window.focus()
      notification.close()
      if (options.onClick) {
        options.onClick()
      }
    }

    return notification
  } catch (err) {
    console.error('Failed to send notification:', err)
    return null
  }
}

// Update document title with unread count
let originalTitle = document.title || '语闻 YuwenChat'
let titleInterval = null

export function updateTitleWithUnread(count) {
  if (titleInterval) {
    clearInterval(titleInterval)
    titleInterval = null
  }

  if (count > 0) {
    const countText = count > 99 ? '99+' : count
    // Blink effect for attention
    let showCount = true
    document.title = `(${countText}) ${originalTitle}`

    titleInterval = setInterval(() => {
      if (document.hasFocus()) {
        document.title = `(${countText}) ${originalTitle}`
        clearInterval(titleInterval)
        titleInterval = null
        return
      }
      showCount = !showCount
      document.title = showCount ? `(${countText}) ${originalTitle}` : originalTitle
    }, 1000)
  } else {
    document.title = originalTitle
  }
}

// Reset title when window gains focus
if (typeof window !== 'undefined') {
  window.addEventListener('focus', () => {
    if (titleInterval) {
      clearInterval(titleInterval)
      titleInterval = null
    }
  })
}

// Play notification sound
let audioContext = null
export function playNotificationSound() {
  try {
    // Create a simple beep sound using Web Audio API
    if (!audioContext) {
      audioContext = new (window.AudioContext || window.webkitAudioContext)()
    }

    const oscillator = audioContext.createOscillator()
    const gainNode = audioContext.createGain()

    oscillator.connect(gainNode)
    gainNode.connect(audioContext.destination)

    oscillator.frequency.value = 800
    oscillator.type = 'sine'

    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime)
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3)

    oscillator.start(audioContext.currentTime)
    oscillator.stop(audioContext.currentTime + 0.3)
  } catch (err) {
    // Silently fail - sound is not critical
  }
}
