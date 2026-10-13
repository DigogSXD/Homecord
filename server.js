import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  },
  maxHttpBufferSize: 1e7 // 10MB limit for image attachments
});

const PORT = process.env.PORT || 5000;
const DB_FILE = path.join(__dirname, 'data_store.json');

// Memory Data Store
let dataStore = {
  channels: [
    { id: 'general', name: 'geral', type: 'text', topic: 'Conversas gerais e bate-papo da galera' },
    { id: 'games', name: 'jogos', type: 'text', topic: 'Procurando duo ou grupo pra jogar' },
    { id: 'memes', name: 'memes-e-links', type: 'text', topic: 'Envie os melhores memes e zoeiras' },
    { id: 'voice-general', name: 'Voz Geral', type: 'voice' },
    { id: 'voice-gaming', name: 'Sala de Jogos', type: 'voice' },
    { id: 'voice-lounge', name: 'Cantinho VIP', type: 'voice' }
  ],
  messages: {
    'general': [
      {
        id: 'msg-1',
        sender: { name: 'Sistema Homecord', avatar: '🏠', color: '#00f2fe', bot: true },
        content: '👋 Bem-vindos ao Homecord! Este é seu servidor privado de casa com chat HD e transmissão de tela.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        channelId: 'general'
      }
    ],
    'games': [],
    'memes': []
  }
};

// Load saved data if exists
if (fs.existsSync(DB_FILE)) {
  try {
    const raw = fs.readFileSync(DB_FILE, 'utf-8');
    const parsed = JSON.parse(raw);
    if (parsed.channels && parsed.messages) {
      dataStore = parsed;
    }
  } catch (err) {
    console.error('Erro ao ler data_store.json:', err);
  }
}

function saveData() {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(dataStore, null, 2));
  } catch (err) {
    console.error('Erro ao salvar data_store.json:', err);
  }
}

// Active users tracking
// Socket ID -> User Data
const connectedUsers = new Map();
// Voice channel ID -> Set of { socketId, user }
const voiceRooms = new Map();

app.use(express.json());

// Serve static frontend in production if built
const distPath = path.join(__dirname, 'dist');

app.use((req, res, next) => {
  if (fs.existsSync(distPath)) {
    return express.static(distPath)(req, res, next);
  }
  next();
});

app.get('*', (req, res) => {
  if (fs.existsSync(distPath)) {
    return res.sendFile(path.join(distPath, 'index.html'));
  }
  res.send('Servidor Backend do Discord 2 está rodando na porta 5000! Execute `npm run dev` para abrir a interface visual.');
});

// Socket.io Real-time logic
io.on('connection', (socket) => {
  console.log(`🔌 Novo cliente conectado: ${socket.id}`);

  // Ping latency check
  socket.on('ping:check', (timestamp) => {
    socket.emit('pong:check', timestamp);
  });

  // User Join Event
  socket.on('user:join', (userData) => {
    const user = {
      id: socket.id,
      name: userData.name || 'Amigo Anônimo',
      avatar: userData.avatar || '😎',
      color: userData.color || '#5865F2',
      status: 'online',
      customStatus: userData.customStatus || 'Conectado ao Discord 2',
      joinedAt: new Date()
    };

    connectedUsers.set(socket.id, user);

    // Send initial state to user
    socket.emit('init:state', {
      channels: dataStore.channels,
      messages: dataStore.messages,
      users: Array.from(connectedUsers.values()),
      voiceRooms: getVoiceRoomsState(),
      currentUserId: socket.id
    });

    // Broadcast new user connected to all
    io.emit('users:update', Array.from(connectedUsers.values()));
  });

  // User status change
  socket.on('user:status_change', (status) => {
    const u = connectedUsers.get(socket.id);
    if (u) {
      u.status = status;
      connectedUsers.set(socket.id, u);
      io.emit('users:update', Array.from(connectedUsers.values()));
    }
  });

  // User custom status change
  socket.on('user:custom_status', (customStatus) => {
    const u = connectedUsers.get(socket.id);
    if (u) {
      u.customStatus = customStatus;
      connectedUsers.set(socket.id, u);
      io.emit('users:update', Array.from(connectedUsers.values()));
    }
  });

  // Chat Message Received
  socket.on('chat:message', ({ channelId, content, attachment }) => {
    const user = connectedUsers.get(socket.id);
    if (!user || !channelId) return;

    if (!dataStore.messages[channelId]) {
      dataStore.messages[channelId] = [];
    }

    const newMessage = {
      id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      sender: user,
      content: content || '',
      attachment: attachment || null,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      channelId
    };

    dataStore.messages[channelId].push(newMessage);
    // Keep max 500 messages per channel
    if (dataStore.messages[channelId].length > 500) {
      dataStore.messages[channelId].shift();
    }

    saveData();

    // Broadcast message to everyone
    io.emit('chat:message', newMessage);
  });

  // Typing indicator
  socket.on('chat:typing', ({ channelId, isTyping }) => {
    const user = connectedUsers.get(socket.id);
    if (user) {
      socket.broadcast.emit('chat:typing', {
        channelId,
        user: { id: user.id, name: user.name },
        isTyping
      });
    }
  });

  // Create Channel
  socket.on('channel:create', ({ name, type, topic }) => {
    const cleanName = name.toLowerCase().replace(/\s+/g, '-');
    const id = `${type}-${Date.now()}`;
    const newChan = { id, name: cleanName, type, topic: topic || '' };

    dataStore.channels.push(newChan);
    if (type === 'text' && !dataStore.messages[id]) {
      dataStore.messages[id] = [];
    }

    saveData();
    io.emit('channel:created', { channel: newChan, channels: dataStore.channels });
  });

  // Delete Channel
  socket.on('channel:delete', (channelId) => {
    dataStore.channels = dataStore.channels.filter(c => c.id !== channelId);
    delete dataStore.messages[channelId];
    saveData();
    io.emit('channel:deleted', { channelId, channels: dataStore.channels });
  });

  // Delete Message
  socket.on('message:delete', ({ messageId, channelId }) => {
    if (dataStore.messages[channelId]) {
      dataStore.messages[channelId] = dataStore.messages[channelId].filter(m => m.id !== messageId);
      saveData();
      io.emit('message:deleted', { messageId, channelId });
    }
  });

  // --- WEBRTC VOICE CHANNELS SIGNALING ---
  socket.on('voice:join', (channelId) => {
    const user = connectedUsers.get(socket.id);
    if (!user) return;

    // Leave any previous voice room
    leaveAllVoiceRooms(socket.id);

    if (!voiceRooms.has(channelId)) {
      voiceRooms.set(channelId, new Map());
    }

    const room = voiceRooms.get(channelId);
    const voiceState = {
      socketId: socket.id,
      user,
      isMuted: false,
      isDeafened: false,
      isSpeaking: false,
      isStreaming: false,
      isCameraOn: false,
      screenStreamId: null,
      cameraStreamId: null,
      screenTrackId: null,
      cameraTrackId: null
    };

    room.set(socket.id, voiceState);
    socket.join(`voice:${channelId}`);

    // Notify others in room
    socket.to(`voice:${channelId}`).emit('voice:peer_joined', {
      socketId: socket.id,
      user
    });

    // Send existing peers in room to joining user
    const existingPeers = [];
    room.forEach((peer, peerId) => {
      if (peerId !== socket.id) {
        existingPeers.push({
          socketId: peerId,
          user: peer.user,
          isMuted: peer.isMuted,
          isDeafened: peer.isDeafened,
          isSpeaking: peer.isSpeaking,
          isStreaming: peer.isStreaming || false,
          isCameraOn: peer.isCameraOn || false,
          screenStreamId: peer.screenStreamId,
          cameraStreamId: peer.cameraStreamId,
          screenTrackId: peer.screenTrackId,
          cameraTrackId: peer.cameraTrackId
        });
      }
    });

    socket.emit('voice:room_users', { channelId, peers: existingPeers });
    io.emit('voice:state_update', getVoiceRoomsState());
  });

  socket.on('voice:leave', () => {
    leaveAllVoiceRooms(socket.id);
    io.emit('voice:state_update', getVoiceRoomsState());
  });

  // WebRTC Signal relay
  socket.on('voice:signal', ({ to, signalData }) => {
    io.to(to).emit('voice:signal', {
      from: socket.id,
      signalData
    });
  });

  // Speaking indicator
  socket.on('voice:speaking', ({ channelId, isSpeaking }) => {
    const room = voiceRooms.get(channelId);
    if (room && room.has(socket.id)) {
      const state = room.get(socket.id);
      state.isSpeaking = isSpeaking;
      socket.to(`voice:${channelId}`).emit('voice:speaking_update', {
        socketId: socket.id,
        isSpeaking
      });
      io.emit('voice:state_update', getVoiceRoomsState());
    }
  });

  // Screen Share status update
  socket.on('voice:stream_update', ({ channelId, isStreaming, streamId, trackId, hasAudio }) => {
    const room = voiceRooms.get(channelId);
    if (room && room.has(socket.id)) {
      const state = room.get(socket.id);
      state.isStreaming = isStreaming;
      state.screenStreamId = isStreaming ? streamId : null;
      state.screenTrackId = isStreaming ? trackId : null;
      state.hasAudio = isStreaming ? !!hasAudio : false;
      io.emit('voice:stream_changed', {
        socketId: socket.id,
        user: state.user,
        channelId,
        isStreaming,
        streamId,
        hasAudio: !!hasAudio
      });

      io.emit('voice:state_update', getVoiceRoomsState());
    }
  });

  socket.on('voice:camera_update', ({ channelId, isCameraOn, streamId, trackId }) => {
    const room = voiceRooms.get(channelId);
    if (room && room.has(socket.id)) {
      const state = room.get(socket.id);
      state.isCameraOn = isCameraOn;
      state.cameraStreamId = isCameraOn ? streamId : null;
      state.cameraTrackId = isCameraOn ? trackId : null;
      io.emit('voice:state_update', getVoiceRoomsState());
    }
  });

  // Mute / Deaf status
  socket.on('voice:mute_update', ({ channelId, isMuted, isDeafened }) => {
    const room = voiceRooms.get(channelId);
    if (room && room.has(socket.id)) {
      const state = room.get(socket.id);
      state.isMuted = isMuted;
      state.isDeafened = isDeafened;
      socket.to(`voice:${channelId}`).emit('voice:user_mute_changed', {
        socketId: socket.id,
        isMuted,
        isDeafened
      });
      io.emit('voice:state_update', getVoiceRoomsState());
    }
  });

  // Admin Force Mute user mic
  socket.on('voice:force_mute', ({ targetSocketId }) => {
    io.to(targetSocketId).emit('voice:forced_mute');
  });

  // Admin Move user to another voice channel
  socket.on('voice:move_user', ({ targetSocketId, targetChannelId }) => {
    io.to(targetSocketId).emit('voice:moved_channel', targetChannelId);
  });

  // Disconnect
  socket.on('disconnect', () => {
    console.log(`❌ Cliente desconectado: ${socket.id}`);
    leaveAllVoiceRooms(socket.id);
    connectedUsers.delete(socket.id);
    io.emit('users:update', Array.from(connectedUsers.values()));
    io.emit('voice:state_update', getVoiceRoomsState());
  });
});

function leaveAllVoiceRooms(socketId) {
  voiceRooms.forEach((room, channelId) => {
    if (room.has(socketId)) {
      const state = room.get(socketId);
      if (state && state.isStreaming) {
        io.emit('voice:stream_changed', {
          socketId,
          user: state.user,
          channelId,
          isStreaming: false
        });
      }
      room.delete(socketId);
      io.to(`voice:${channelId}`).emit('voice:peer_left', { socketId });
      if (room.size === 0) {
        voiceRooms.delete(channelId);
      }
    }
  });
}

function getVoiceRoomsState() {
  const result = {};
  voiceRooms.forEach((room, channelId) => {
    result[channelId] = Array.from(room.values());
  });
  return result;
}

httpServer.listen(PORT, () => {
  console.log(`
  🚀 SERVIDOR DISCORD 2 RODANDO!
  -----------------------------------------------
  📍 Local:            http://localhost:${PORT}
  🌐 Na sua rede (LAN): http://0.0.0.0:${PORT}
  -----------------------------------------------
  `);
});
