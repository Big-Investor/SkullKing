const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const crypto = require('crypto');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
});

const PORT = process.env.PORT || 3000;

// ─── Configuration ────────────────────────────────────────────────────────────
const ROOM_MAX_PLAYERS = 5;         // Maximum players per room
const RECONNECT_GRACE_MS = 30_000;  // Grace period before removing a disconnected player

app.use(express.json());

// ─── Room State ───────────────────────────────────────────────────────────────
// rooms: Map<roomId, { id, players: Map<playerName, { socketId, leaveTimeout }> }>
const rooms = new Map();

function deleteRoomIfEmpty(roomId) {
  const room = rooms.get(roomId);
  if (room && room.players.size === 0) {
    rooms.delete(roomId);
    console.log(`[Room ${roomId}] deleted (empty)`);
  }
}

// ─── REST API ─────────────────────────────────────────────────────────────────
app.post('/api/rooms', (_req, res) => {
  const id = crypto.randomBytes(4).toString('hex');
  rooms.set(id, { id, players: new Map() });
  console.log(`[Room ${id}] created`);
  res.status(201).json({ roomId: id });
});

app.get('/api/rooms/:id', (req, res) => {
  res.json({ exists: rooms.has(req.params.id) });
});

app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));

// ─── Socket.io ────────────────────────────────────────────────────────────────
io.on('connection', (socket) => {
  let roomId = null;
  let playerName = null;

  function removePlayer(immediate) {
    if (!roomId || !playerName) return;
    const room = rooms.get(roomId);
    if (!room) return;
    const player = room.players.get(playerName);
    if (!player) return;

    if (player.leaveTimeout) clearTimeout(player.leaveTimeout);
    room.players.delete(playerName);
    socket.leave(roomId);

    io.to(roomId).emit('room:user_left', {
      playerName,
      players: Array.from(room.players.keys()),
    });
    console.log(`[Room ${roomId}] ${playerName} left (${room.players.size}/${ROOM_MAX_PLAYERS})`);

    const leavingRoom = roomId;
    roomId = null;
    playerName = null;

    deleteRoomIfEmpty(leavingRoom);
  }

  socket.on('room:join', ({ roomId: rid, playerName: name }) => {
    if (typeof rid !== 'string' || typeof name !== 'string') return;
    const trimmedName = name.trim().slice(0, 20);
    if (!trimmedName) return;

    const room = rooms.get(rid);
    if (!room) {
      socket.emit('room:not_found', { message: `Raum "${rid}" wurde nicht gefunden.` });
      return;
    }

    const existing = room.players.get(trimmedName);
    if (existing) {
      // Reconnection: cancel pending removal and update socket ID
      if (existing.leaveTimeout) {
        clearTimeout(existing.leaveTimeout);
        existing.leaveTimeout = null;
      }
      existing.socketId = socket.id;
    } else {
      if (room.players.size >= ROOM_MAX_PLAYERS) {
        socket.emit('room:full', {
          message: `Dieser Raum ist bereits voll (max. ${ROOM_MAX_PLAYERS} Spieler).`,
        });
        return;
      }
      room.players.set(trimmedName, { socketId: socket.id, leaveTimeout: null });
      socket.to(rid).emit('room:user_joined', {
        playerName: trimmedName,
        players: Array.from(room.players.keys()),
      });
    }

    roomId = rid;
    playerName = trimmedName;
    socket.join(rid);

    socket.emit('room:joined', { players: Array.from(room.players.keys()) });
    console.log(`[Room ${rid}] ${trimmedName} joined (${room.players.size}/${ROOM_MAX_PLAYERS})`);
  });

  socket.on('chat:send', ({ message }) => {
    if (!roomId || !playerName || !rooms.has(roomId)) return;
    if (typeof message !== 'string' || !message.trim()) return;
    io.to(roomId).emit('chat:message', {
      playerName,
      message: message.trim().slice(0, 500),
      timestamp: Date.now(),
    });
  });

  socket.on('room:leave', () => removePlayer(true));
  socket.on('disconnect', () => {
    if (!roomId || !playerName) return;
    const room = rooms.get(roomId);
    if (!room) return;
    const player = room.players.get(playerName);
    if (!player) return;
    player.leaveTimeout = setTimeout(() => removePlayer(false), RECONNECT_GRACE_MS);
    console.log(`[Room ${roomId}] ${playerName} disconnected (grace period started)`);
  });
});

// ─── Serve Angular production build ──────────────────────────────────────────
const distPath = path.join(__dirname, 'dist', 'browser');
app.use(express.static(distPath));

app.get('*', (_req, res) => res.sendFile(path.join(distPath, 'index.html')));

server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
