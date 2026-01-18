# YuwenChat (语闻)

[English](#english) | [中文](#中文)

---

# English

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
- **Unread Badges** - See unread message counts on contacts
- **Browser Notifications** - Get notified when new messages arrive

### User Experience
- **Avatar Customization** - Upload custom avatars or choose background colors
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

## Project Structure

```
├── client/                 # Frontend (Vue 3)
│   ├── src/
│   │   ├── components/     # Vue components
│   │   ├── views/          # Page views
│   │   ├── stores/         # Pinia stores
│   │   └── utils/          # Utilities (crypto, API, etc.)
│   └── dist/               # Built files (served by Nginx)
│
├── server/                 # Backend (Node.js)
│   ├── src/
│   │   ├── db/             # Database schema & queries
│   │   └── routes/         # API routes
│   ├── data/
│   │   └── chat.db         # SQLite database (important!)
│   └── uploads/            # User uploaded files
│       └── avatars/        # User avatars
│
└── DEPLOY_GUIDE.md         # Deployment guide
```

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

---

# 中文

一个轻量级、隐私优先的端对端加密聊天应用。"干翻微信的方式。"

## 功能特性

### 安全与加密
- **端对端加密 (E2EE)** - 所有消息在你的设备上加密
- **可视化安全验证** - 通过比对 emoji 验证聊天安全（类似 Signal 的安全码）
- **私钥保护** - 你的私钥用密码加密后安全存储
- **安全指纹** - 分享公钥指纹来验证身份
- **零知识** - 服务器管理员无法阅读你的消息（数学保证）

### 聊天功能
- **私聊** - 一对一加密消息
- **群聊** - 端对端加密的群组消息
- **好友代码** - 使用6位代码添加好友
- **实时消息** - 通过 WebSocket 即时送达
- **消息状态** - 已发送、已送达、已读状态
- **编辑/删除消息** - 可删除自己或双方的消息
- **输入提示** - 显示对方正在输入
- **在线状态** - 查看好友是否在线
- **未读角标** - 显示联系人未读消息数量
- **浏览器通知** - 新消息到达时收到通知

### 用户体验
- **头像自定义** - 上传自定义头像或选择背景颜色
- **双语支持** - 英文和中文
- **明/暗主题** - 主题切换
- **响应式设计** - 支持手机和电脑
- **会话持久化** - 用密码解锁会话
- **自动更新** - 在管理面板更新应用

### 管理功能
- **管理面板** - 管理用户、群组，查看统计
- **用户管理** - 查看和管理所有用户
- **群组管理** - 监控和管理群组

## 技术栈

- **前端**: Vue 3 + Vite + Pinia
- **后端**: Node.js + Express + Socket.io
- **数据库**: SQLite (better-sqlite3)
- **加密**: TweetNaCl.js (NaCl/libsodium 移植版)

## 快速开始

### 1. 安装依赖

```bash
# 后端
cd server
npm install

# 前端
cd ../client
npm install
```

### 2. 配置环境变量

```bash
cd server
cp .env.example .env
# 编辑 .env 文件
```

### 3. 运行开发服务器

```bash
# 终端 1 - 后端
cd server
npm run dev

# 终端 2 - 前端
cd client
npm run dev
```

### 4. 打开浏览器

访问 http://localhost:5173

## 部署

详见 [DEPLOY_GUIDE.md](./DEPLOY_GUIDE.md) 部署指南。

## 项目结构

```
├── client/                 # 前端 (Vue 3)
│   ├── src/
│   │   ├── components/     # Vue 组件
│   │   ├── views/          # 页面视图
│   │   ├── stores/         # Pinia 状态管理
│   │   └── utils/          # 工具函数（加密、API等）
│   └── dist/               # 构建文件（Nginx 指向这里）
│
├── server/                 # 后端 (Node.js)
│   ├── src/
│   │   ├── db/             # 数据库结构和查询
│   │   └── routes/         # API 路由
│   ├── data/
│   │   └── chat.db         # SQLite 数据库（重要！）
│   └── uploads/            # 用户上传的文件
│       └── avatars/        # 用户头像
│
└── DEPLOY_GUIDE.md         # 部署指南
```

## 安全架构

### 加密工作原理

1. **注册**
   - 在你的设备上生成密钥对 (X25519)
   - 私钥用密码派生的密钥加密 (scrypt)
   - 只有加密后的私钥和公钥发送到服务器

2. **私聊加密**
   - 消息使用你的私钥 + 对方的公钥加密
   - 使用 XSalsa20-Poly1305（认证加密）
   - 服务器只能看到加密数据

3. **群聊加密**
   - 每个群组有一个对称加密密钥
   - 群密钥用每个成员的公钥加密后分发
   - 新成员自动从在线成员获取密钥

4. **安全验证**
   - 通过比对 emoji 验证聊天安全
   - 如果你和好友看到相同的 8 个 emoji，说明没人窃听
   - 基于双方公钥的哈希值

### 修改密码的安全性
- 修改密码时，私钥会用新密码重新加密
- 这完全在你的设备上进行
- 管理员密码重置功能已禁用，防止丢失加密数据访问权

## 隐私保证

- 服务器管理员 **无法** 阅读你的消息
- 你的密码 **永远不会** 离开你的设备
- 私钥 **永远不会** 以未加密形式存储在服务器
- 所有加密都在 **客户端** 进行

---

## License / 许可证

MIT
