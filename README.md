# YuwenChat (语闻)

A lightweight, privacy-first end-to-end encrypted chat application. "A way to beat WeChat."

## Features

### Security & Encryption
- **End-to-End Encryption (E2EE)** - All messages encrypted on your device
- **Visual Security Verification** - Verify chat security with matching emoji codes (like Signal's safety numbers)
- **Private Key Protection** - Your private key is encrypted with your password and stored securely
- **Security Fingerprints** - Share your public key fingerprint to verify identity
- **Zero-Knowledge** - Server admins cannot read your messages (mathematically guaranteed)

### Chat Features
- **Private Chat** - One-on-one encrypted messaging
- **Group Chat** - Group messaging with E2E encryption
- **Friend Code System** - Add friends using unique 6-character codes
- **Real-time Messaging** - Instant delivery via WebSocket
- **Message Status** - Sent, delivered, and read indicators
- **Message Edit/Delete** - Edit or delete messages for yourself or both parties
- **Typing Indicators** - See when someone is typing
- **Online Status** - See which friends are online

### User Experience
- **Bilingual Support** - English and Chinese (中文)
- **Dark/Light Mode** - Theme toggle
- **Responsive Design** - Works on mobile and desktop
- **Session Persistence** - Unlock your session with your password
- **Auto-Update System** - Update the app from the admin panel

### Admin Features
- **Admin Panel** - Manage users, groups, and view statistics
- **User Management** - View and manage all users
- **Group Management** - Monitor and manage groups

## Tech Stack

- **Frontend**: Vue 3 + Vite + Pinia
- **Backend**: Node.js + Express + Socket.io
- **Database**: SQLite (better-sqlite3)
- **Encryption**: TweetNaCl.js (NaCl/libsodium port)

## Quick Start

### 1. Install Dependencies

```bash
# Backend
cd server
npm install

# Frontend
cd ../client
npm install
```

### 2. Configure Environment

```bash
cd server
cp .env.example .env
# Edit .env with your settings
```

### 3. Run Development Server

```bash
# Terminal 1 - Backend
cd server
npm run dev

# Terminal 2 - Frontend
cd client
npm run dev
```

### 4. Open Browser

Visit http://localhost:5173

## Deployment

See [DEPLOY_GUIDE.md](./DEPLOY_GUIDE.md) for detailed deployment instructions.

## Security Architecture

### How Encryption Works

1. **Registration**
   - A keypair (X25519) is generated on your device
   - Your private key is encrypted with a key derived from your password (scrypt)
   - Only the encrypted private key and public key are sent to the server

2. **Private Chat Encryption**
   - Messages are encrypted using your private key + recipient's public key
   - Uses XSalsa20-Poly1305 (authenticated encryption)
   - The server only sees encrypted data

3. **Group Chat Encryption**
   - Each group has a symmetric encryption key
   - The group key is distributed encrypted to each member's public key
   - New members receive the key from online members automatically

4. **Security Verification**
   - You can verify your chat is secure by comparing emoji codes
   - If you and your friend see the same 8 emojis, no one is intercepting
   - Based on a hash of both users' public keys

### Password Change Security
- When you change your password, your private key is re-encrypted with the new password
- This happens entirely on your device
- Admin password reset is disabled to prevent losing access to your encrypted data

## Privacy Guarantees

- Server admins **cannot** read your messages
- Your password **never** leaves your device
- Private keys are **never** stored unencrypted on the server
- All encryption happens **client-side**
