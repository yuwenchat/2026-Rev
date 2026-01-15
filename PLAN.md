# YuwenChat - 极简端对端加密聊天应用

## 项目概述

一个轻量级、隐私优先的 Web 聊天应用，支持端对端加密、好友系统和群聊功能。

## 技术栈

```
前端: Vue 3 + Vite + Pinia (状态管理)
后端: Node.js + Express + Socket.io
数据库: SQLite (better-sqlite3)
加密: tweetnacl.js (端对端加密)
部署: PM2 + Nginx (宝塔面板)
```

## 核心功能

### 1. 用户系统
- [ ] 用户注册/登录 (用户名 + 密码)
- [ ] 生成唯一好友码 (6位随机码，如: `A3X9K2`)
- [ ] 通过好友码添加好友
- [ ] 用户公钥/私钥生成与管理

### 2. 端对端加密
- [ ] 注册时生成密钥对 (X25519)
- [ ] 私钥用用户密码加密后存储
- [ ] 消息使用收件人公钥加密
- [ ] 服务器只存储加密后的消息 (无法解密)

### 3. 私聊
- [ ] 实时消息收发 (WebSocket)
- [ ] 消息状态 (已发送/已送达/已读)
- [ ] 历史消息加载
- [ ] 在线状态显示

### 4. 群聊
- [ ] 创建群组 (生成群组码)
- [ ] 通过群组码加入
- [ ] 群组密钥管理 (对称加密)
- [ ] 群成员管理

### 5. UI/UX
- [ ] 极简界面设计
- [ ] 深色/浅色主题
- [ ] 响应式布局 (手机/电脑)
- [ ] PWA 支持 (可添加到主屏幕)

---

## 项目结构

```
yuwenchat/
├── client/                 # 前端 Vue 应用
│   ├── src/
│   │   ├── components/     # 组件
│   │   │   ├── ChatList.vue
│   │   │   ├── ChatWindow.vue
│   │   │   ├── MessageInput.vue
│   │   │   └── AddFriend.vue
│   │   ├── views/          # 页面
│   │   │   ├── Login.vue
│   │   │   ├── Register.vue
│   │   │   └── Chat.vue
│   │   ├── stores/         # Pinia 状态
│   │   │   ├── user.js
│   │   │   └── chat.js
│   │   ├── utils/
│   │   │   └── crypto.js   # 加密工具
│   │   ├── App.vue
│   │   └── main.js
│   ├── index.html
│   └── vite.config.js
│
├── server/                 # 后端 Node.js
│   ├── src/
│   │   ├── routes/
│   │   │   ├── auth.js     # 认证路由
│   │   │   ├── friends.js  # 好友路由
│   │   │   └── groups.js   # 群组路由
│   │   ├── socket/
│   │   │   └── handler.js  # WebSocket 处理
│   │   ├── db/
│   │   │   ├── schema.sql  # 数据库结构
│   │   │   └── index.js    # 数据库操作
│   │   └── index.js        # 入口
│   ├── data/
│   │   └── chat.db         # SQLite 数据库文件
│   └── package.json
│
├── .env.example            # 环境变量示例
└── README.md
```

---

## 数据库设计

### users 表
```sql
CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  friend_code TEXT UNIQUE NOT NULL,      -- 6位好友码
  public_key TEXT NOT NULL,              -- 公钥 (base64)
  encrypted_private_key TEXT NOT NULL,   -- 加密的私钥
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### friends 表
```sql
CREATE TABLE friends (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  friend_id INTEGER NOT NULL,
  status TEXT DEFAULT 'pending',         -- pending/accepted
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (friend_id) REFERENCES users(id)
);
```

### messages 表
```sql
CREATE TABLE messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  sender_id INTEGER NOT NULL,
  receiver_id INTEGER,                   -- 私聊时使用
  group_id INTEGER,                      -- 群聊时使用
  encrypted_content TEXT NOT NULL,       -- 加密后的消息
  nonce TEXT NOT NULL,                   -- 加密随机数
  status TEXT DEFAULT 'sent',            -- sent/delivered/read
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (sender_id) REFERENCES users(id)
);
```

### groups 表
```sql
CREATE TABLE groups (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  group_code TEXT UNIQUE NOT NULL,       -- 6位群组码
  creator_id INTEGER NOT NULL,
  encrypted_group_key TEXT NOT NULL,     -- 加密的群组密钥
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (creator_id) REFERENCES users(id)
);
```

### group_members 表
```sql
CREATE TABLE group_members (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  group_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  encrypted_group_key TEXT NOT NULL,     -- 用该用户公钥加密的群密钥
  role TEXT DEFAULT 'member',            -- admin/member
  joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (group_id) REFERENCES groups(id),
  FOREIGN KEY (user_id) REFERENCES users(id)
);
```

---

## 加密方案

### 密钥生成流程
```
1. 用户注册时:
   - 生成 X25519 密钥对 (公钥/私钥)
   - 用用户密码派生密钥 (使用 scrypt)
   - 用派生密钥加密私钥
   - 公钥和加密私钥存储到服务器

2. 用户登录时:
   - 从服务器获取加密私钥
   - 用密码派生密钥解密私钥
   - 私钥保存在浏览器内存中 (不存储)
```

### 消息加密流程
```
私聊:
1. 发送方用自己私钥 + 接收方公钥生成共享密钥
2. 用共享密钥加密消息 (XSalsa20-Poly1305)
3. 发送加密消息 + nonce 到服务器
4. 接收方用相同方式生成共享密钥解密

群聊:
1. 群组有一个对称密钥
2. 该密钥用每个成员的公钥分别加密存储
3. 消息用群组密钥加密
4. 成员用自己私钥解密群密钥，再解密消息
```

---

## API 设计

### 认证
```
POST /api/auth/register    # 注册
POST /api/auth/login       # 登录
POST /api/auth/logout      # 登出
GET  /api/auth/me          # 获取当前用户信息
```

### 好友
```
POST /api/friends/add      # 通过好友码添加
GET  /api/friends          # 获取好友列表
POST /api/friends/accept   # 接受好友请求
DELETE /api/friends/:id    # 删除好友
```

### 群组
```
POST /api/groups           # 创建群组
POST /api/groups/join      # 通过群组码加入
GET  /api/groups           # 获取群组列表
GET  /api/groups/:id       # 获取群组详情
```

### 消息
```
GET  /api/messages/:chatId # 获取历史消息
```

### WebSocket 事件
```
# 客户端发送
chat:message     # 发送消息
chat:typing      # 正在输入
chat:read        # 标记已读

# 服务端推送
chat:message     # 收到新消息
chat:online      # 用户上线
chat:offline     # 用户下线
friend:request   # 收到好友请求
```

---

## 实施步骤

### 阶段 1: 基础框架
- [ ] 初始化前端项目 (Vue 3 + Vite)
- [ ] 初始化后端项目 (Express + Socket.io)
- [ ] 设置 SQLite 数据库
- [ ] 实现基础路由结构

### 阶段 2: 用户系统
- [ ] 注册功能 (含密钥生成)
- [ ] 登录功能 (含私钥解密)
- [ ] JWT token 认证
- [ ] 好友码生成

### 阶段 3: 加密系统
- [ ] 集成 tweetnacl.js
- [ ] 实现密钥对生成
- [ ] 实现私钥加密存储
- [ ] 实现消息加密/解密

### 阶段 4: 好友系统
- [ ] 通过好友码搜索
- [ ] 发送好友请求
- [ ] 接受/拒绝好友
- [ ] 好友列表展示

### 阶段 5: 私聊功能
- [ ] WebSocket 连接
- [ ] 实时消息收发
- [ ] 消息加密传输
- [ ] 历史消息加载
- [ ] 消息状态更新

### 阶段 6: 群聊功能
- [ ] 创建群组
- [ ] 群组码加入
- [ ] 群密钥分发
- [ ] 群消息加密

### 阶段 7: UI 完善
- [ ] 响应式布局
- [ ] 主题切换
- [ ] 消息通知
- [ ] PWA 配置

### 阶段 8: 部署
- [ ] 编写部署文档
- [ ] 宝塔面板配置
- [ ] Nginx 反向代理
- [ ] HTTPS 配置

---

## 宝塔面板部署指南

### 1. 安装 Node.js
```bash
# 在宝塔面板 -> 软件商店 -> 安装 PM2管理器
# 自动会安装 Node.js
```

### 2. 上传项目
```bash
# 将项目上传到 /www/wwwroot/yuwenchat/
```

### 3. 安装依赖
```bash
cd /www/wwwroot/yuwenchat/server
npm install

cd /www/wwwroot/yuwenchat/client
npm install
npm run build
```

### 4. 配置环境变量
```bash
# 复制 .env.example 为 .env
# 修改必要配置 (JWT密钥等)
```

### 5. PM2 启动
```bash
# 在宝塔 PM2 管理器中添加项目
# 启动文件: /www/wwwroot/yuwenchat/server/src/index.js
```

### 6. Nginx 配置
```nginx
server {
    listen 80;
    server_name your-domain.com;

    # 前端静态文件
    location / {
        root /www/wwwroot/yuwenchat/client/dist;
        try_files $uri $uri/ /index.html;
    }

    # API 代理
    location /api {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }

    # WebSocket 代理
    location /socket.io {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

### 7. 申请 SSL 证书
```
在宝塔面板 -> 网站 -> SSL -> Let's Encrypt -> 申请
```

---

## 安全注意事项

1. **私钥安全**: 私钥只存在于用户浏览器内存中，关闭页面即清除
2. **密码不存储**: 服务器只存储密码哈希 (bcrypt)
3. **消息不可读**: 服务器存储的是加密后的消息，无法解密
4. **HTTPS 必须**: 生产环境必须使用 HTTPS
5. **JWT 过期**: token 设置合理过期时间

---

## 依赖包清单

### 前端 (client/package.json)
```json
{
  "dependencies": {
    "vue": "^3.4.0",
    "vue-router": "^4.2.0",
    "pinia": "^2.1.0",
    "tweetnacl": "^1.0.3",
    "tweetnacl-util": "^0.15.1",
    "scrypt-js": "^3.0.1",
    "socket.io-client": "^4.7.0"
  }
}
```

### 后端 (server/package.json)
```json
{
  "dependencies": {
    "express": "^4.18.0",
    "socket.io": "^4.7.0",
    "better-sqlite3": "^9.4.0",
    "bcrypt": "^5.1.0",
    "jsonwebtoken": "^9.0.0",
    "cors": "^2.8.5",
    "dotenv": "^16.4.0"
  }
}
```

---

## 为什么选择这个技术栈？

| 选择 | 理由 |
|------|------|
| **Vue 3** | 比 React 更简洁，上手快，单文件组件直观 |
| **SQLite** | 零配置，单文件备份，小项目完美，宝塔无需额外安装 |
| **Socket.io** | WebSocket 封装完善，自动重连，房间管理 |
| **tweetnacl** | 纯 JS 实现，无需 native 依赖，审计过的加密库 |
| **PM2** | 宝塔原生支持，进程守护，自动重启 |

这个方案的优势:
- ✅ 全栈 JavaScript，学习成本低
- ✅ 依赖少，轻量化
- ✅ 宝塔面板完美支持
- ✅ 真正的端对端加密
- ✅ 单机即可运行，易于备份迁移
