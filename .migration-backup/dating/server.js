const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const { Server } = require('socket.io');

const dev = process.env.NODE_ENV !== 'production';
const hostname = '0.0.0.0';
const port = parseInt(process.env.PORT || '3000', 10);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const httpServer = createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true);
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error('Error occurred handling', req.url, err);
      res.statusCode = 500;
      res.end('Internal server error');
    }
  });

  const io = new Server(httpServer, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
    path: '/socket.io',
  });

  // Store online users: userId -> socketId
  const onlineUsers = new Map();

  io.on('connection', (socket) => {
    console.log('Socket connected:', socket.id);

    socket.on('user:join', (userId) => {
      if (userId) {
        onlineUsers.set(String(userId), socket.id);
        socket.userId = String(userId);
        socket.join(`user:${userId}`);
        io.emit('users:online', Array.from(onlineUsers.keys()));
        console.log(`User ${userId} joined, online: ${onlineUsers.size}`);
      }
    });

    socket.on('chat:message', (data) => {
      const { toUserId, message } = data;
      // Emit to recipient
      io.to(`user:${toUserId}`).emit('chat:message', message);
    });

    socket.on('chat:typing', (data) => {
      const { toUserId, fromUserId, typing } = data;
      io.to(`user:${toUserId}`).emit('chat:typing', { fromUserId, typing });
    });

    socket.on('notification:send', (data) => {
      const { toUserId, notification } = data;
      io.to(`user:${toUserId}`).emit('notification:new', notification);
    });

    socket.on('videocall:offer', (data) => {
      io.to(`user:${data.toUserId}`).emit('videocall:offer', data);
    });

    socket.on('videocall:answer', (data) => {
      io.to(`user:${data.toUserId}`).emit('videocall:answer', data);
    });

    socket.on('videocall:ice-candidate', (data) => {
      io.to(`user:${data.toUserId}`).emit('videocall:ice-candidate', data);
    });

    socket.on('videocall:end', (data) => {
      io.to(`user:${data.toUserId}`).emit('videocall:end', data);
    });

    socket.on('disconnect', () => {
      if (socket.userId) {
        onlineUsers.delete(socket.userId);
        io.emit('users:online', Array.from(onlineUsers.keys()));
        console.log(`User ${socket.userId} disconnected`);
      }
    });
  });

  // Make io accessible to API routes
  global._io = io;

  httpServer.listen(port, hostname, () => {
    console.log(`> Rich Dating Network running at http://${hostname}:${port}`);
  });
});
