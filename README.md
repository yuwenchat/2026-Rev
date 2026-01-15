# YuwenChat

A lightweight, privacy-first encrypted chat application.

## Features

- End-to-end encryption (E2EE)
- Friend code system
- Private chat
- Group chat
- Real-time messaging via WebSocket
- Responsive design

## Tech Stack

- **Frontend**: Vue 3 + Vite + Pinia
- **Backend**: Node.js + Express + Socket.io
- **Database**: SQLite
- **Encryption**: TweetNaCl.js

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

## Security

- All messages are end-to-end encrypted
- Private keys are encrypted with user passwords
- Server cannot read message contents
- Uses TweetNaCl.js (NaCl/libsodium port)

## License

MIT
