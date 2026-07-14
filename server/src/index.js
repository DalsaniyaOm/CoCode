require('dotenv').config();

const express = require('express');
const http = require('http');
const mongoose = require('mongoose');
const cors = require('cors');

const { initWebSocket } = require('./config/websocket');
const authRoutes = require('./routes/auth');
const workspaceRoutes = require('./routes/workspace');

const app = express();
const server = http.createServer(app);

const PORT = process.env.PORT || 5000;

// Middleware
app.use(
  cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
  })
);

app.use(express.json());

// Root test route
app.get('/', (req, res) => {
  res.json({
    status: 'active',
    message: 'CoCode API is running smoothly'
  });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/workspace', workspaceRoutes);

// Initialize WebSocket
initWebSocket(server);

// Connect to MongoDB
if (process.env.NODE_ENV !== 'test') {
  mongoose
    .connect(process.env.MONGO_URI)
    .then(() => {
      console.log('MongoDB Connected');
    })
    .catch((error) => {
      console.log('MongoDB Error:', error);
    });
}

// Start server
if (process.env.NODE_ENV !== 'test') {
  server.listen(PORT, () => {
    console.log('Server running on port ' + PORT);
  });
}

module.exports = app;