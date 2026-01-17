import 'dotenv/config';
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

import authRoutes from './routes/auth.js';
import friendsRoutes from './routes/friends.js';
import groupsRoutes from './routes/groups.js';
import messagesRoutes from './routes/messages.js';
import adminRoutes from './routes/admin.js';
import uploadRoutes from './routes/upload.js';
import updatesRoutes from './routes/updates.js';
import { socketAuthMiddleware } from './middleware/auth.js';
import { setupSocketHandlers } from './socket/handler.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const server = createServer(app);

// CORS configuration
const corsOptions = {
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true
};

app.use(cors(corsOptions));
app.use(express.json());

// Socket.io setup
const io = new Server(server, {
  cors: corsOptions
});

io.use(socketAuthMiddleware);
setupSocketHandlers(io);

// Serve uploaded files
const UPLOAD_DIR = process.env.UPLOAD_DIR || join(__dirname, '../uploads');
app.use('/uploads', express.static(UPLOAD_DIR));

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/friends', friendsRoutes);
app.use('/api/groups', groupsRoutes);
app.use('/api/messages', messagesRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/updates', updatesRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`YuwenChat server running on port ${PORT}`);
});
