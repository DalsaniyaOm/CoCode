const { Server } = require("socket.io");
const { YSocketIO } = require("y-socket.io/dist/server");

const initWebSocket = (server) => {
  const io = new Server(server, {
    cors: {
      origin: process.env.FRONTEND_URL || "http://localhost:5173",
      methods: ["GET", "POST"]
    }
  });

  const ySocketIO = new YSocketIO(io);
  ySocketIO.initialize();

  // Task 3.3: Log every room/document as it's created or loaded
  ySocketIO.on('document-loaded', (doc) => {
    console.log(`📂 WebSocket room active: "${doc.name}"`);
  });

  io.on("connection", (socket) => {
    console.log(`⚡ Socket connected: ${socket.id}`);
    
    socket.on("disconnect", () => {
      console.log(`🔌 Socket disconnected: ${socket.id}`);
    });
  });

  return io;
};

module.exports = { initWebSocket };