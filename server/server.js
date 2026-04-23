import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import { createServer } from 'http';
import jwt from 'jsonwebtoken';
import User from './models/User.js';
import BloodRequest from './models/BloodRequest.js';
import { initSocket } from './socket.js';

dotenv.config();

const app = express();
const httpServer = createServer(app);
const io = initSocket(httpServer);

// Middleware
app.use(express.json());
app.use(cors());

// DB Connection
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('✅ MongoDB connected successfully'))
  .catch((err) => console.error('❌ MongoDB connection error:', err));

// Socket.io basic setup
io.on('connection', (socket) => {
  console.log('👤 New client connected:', socket.id);

  socket.on('auth', async ({ token } = {}) => {
    try {
      if (!token) return;
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id);
      if (!user) return;

      socket.data.userId = user._id.toString();
      socket.data.role = user.role;
      socket.join(`user:${socket.data.userId}`);
      socket.emit('authed', { userId: socket.data.userId, role: user.role });
    } catch (err) {
      socket.emit('auth_error', { message: 'Invalid token' });
    }
  });

  socket.on('join_request_room', async ({ requestId } = {}) => {
    try {
      if (!socket.data.userId) return;
      if (!requestId) return;
      const reqDoc = await BloodRequest.findById(requestId);
      if (!reqDoc) return;
      const uid = socket.data.userId;
      const isRequester = reqDoc.requester?.toString() === uid;
      const isDonor = reqDoc.donor?.toString() === uid;
      const isAdmin = socket.data.role === 'admin';
      if (!isRequester && !isDonor && !isAdmin) return;

      socket.join(`request:${requestId}`);
      socket.emit('joined_request_room', { requestId });
    } catch (err) {
      socket.emit('socket_error', { message: err.message });
    }
  });

  socket.on('donor_location', async ({ requestId, location } = {}) => {
    try {
      if (!socket.data.userId) return;
      if (!requestId || !location) return;
      const uid = socket.data.userId;

      const reqDoc = await BloodRequest.findById(requestId).select('donor requester status');
      if (!reqDoc) return;
      if (reqDoc.donor?.toString() !== uid && socket.data.role !== 'admin') return;

      io.to(`request:${requestId}`).emit('donor_location', {
        requestId,
        location,
      });
    } catch (err) {
      socket.emit('socket_error', { message: err.message });
    }
  });
  
  socket.on('disconnect', () => {
    console.log('👤 Client disconnected');
  });
});

// Routes Placeholder
import authRoutes from './routes/authRoutes.js';
import requestRoutes from './routes/requestRoutes.js';
import analyticsRoutes from './routes/analyticsRoutes.js';
import donorRoutes from './routes/donorRoutes.js';
import userRoutes from './routes/userRoutes.js';

app.use('/api/auth', authRoutes);
app.use('/api/requests', requestRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/donors', donorRoutes);
app.use('/api/users', userRoutes);

app.get('/', (req, res) => {
  res.send('LifeLink API is running...');
});

const PORT = process.env.PORT || 5000;
httpServer.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});

export { io };
