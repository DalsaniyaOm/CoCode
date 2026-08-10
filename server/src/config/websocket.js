const { Server } = require("socket.io");
const { YSocketIO } = require("y-socket.io/dist/server");
const { initSnapshotCron } = require('../services/snapshotCron')

const SIMULATOR_CONFIG = {
  isActive: true,       // Toggle to 'false' during normal team development
  lossRate: 0.30        // 0.30 = 30% of all incoming packets will be destroyed
};

const initWebSocket = (server) => {
  const io = new Server(server, {
    cors: {
      origin: process.env.FRONTEND_URL || "http://localhost:5173",
      methods: ["GET", "POST"]
    }
  });

  io.use((socket, next) => {
    socket.use((packet, nextMiddleware) => {
      if (SIMULATOR_CONFIG.isActive) {
        const randomRoll = Math.random();
        if (randomRoll < SIMULATOR_CONFIG.lossRate) {
          console.warn(`🧨 [QA SIMULATOR] Packet destroyed from socket ${socket.id}. Event: ${packet[0]}`);
          return;
        }
      }
      nextMiddleware();
    });
    next();
  });

  const ySocketIO = new YSocketIO(io);
  ySocketIO.initialize();

  initSnapshotCron(ySocketIO);

  ySocketIO.on('document-loaded', async (doc) => {
    console.log(`📂 WebSocket room active: "${doc.name}"`);
    const Workspace = require('../models/Workspace');
    const workspaceData = await Workspace.findOne({ roomId: doc.name });

    if (workspaceData && workspaceData.documentState) {
      const Y = require('yjs');
      Y.applyUpdate(doc, workspaceData.documentState);
      console.log(`📥 [DB] Restored previous snapshot for ${doc.name}`);
    }
  });

  io.on("connection", (socket) => {
    console.log(`⚡ Socket connected: ${socket.id}`);

    // 1. Listen for the frontend asking to join a workspace room
    socket.on('join-room', (roomId) => {
        socket.join(roomId);
    });

    // 2. Broadcast the terminal output ONLY to that specific room
    socket.on('broadcast-output', ({ roomId, output }) => {
        socket.to(roomId).emit('receive-output', output);
    });

    socket.on('update-files', ({ roomId, files }) => {
      socket.to(roomId).emit('files-updated', files);
    });

    socket.on("disconnect", () => {
      console.log(`🔌 Socket disconnected: ${socket.id}`);
    });
  });

  return io;
};

module.exports = { initWebSocket };