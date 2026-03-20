const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const crypto = require('crypto');
const Game = require('./classes/Game'); // Importiere Game Logik

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
});

const PORT = process.env.PORT || 3000;

app.use(express.json());

// ─── Game Management ──────────────────────────────────────────────────────────
const games = new Map(); // Map<roomId, GameInstance>

// ─── REST API ─────────────────────────────────────────────────────────────────
app.post('/api/rooms', (req, res) => {
  const id = crypto.randomBytes(4).toString('hex');
  const game = new Game(id, io);
  
  // Optional: Bot Configuration
  if (req.body.withBots && req.body.botCount > 0) {
      game.addBots(req.body.botCount, req.body.difficulty || 'medium');
      console.log(`[Game ${id}] created with ${req.body.botCount} bots (${req.body.difficulty})`);
  } else {
      console.log(`[Game ${id}] created`);
  }
  
  games.set(id, game);
  res.status(201).json({ roomId: id });
});

app.get('/api/rooms/:id', (req, res) => {
  res.json({ exists: games.has(req.params.id) });
});

app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));

// ─── Socket.io ────────────────────────────────────────────────────────────────
io.on('connection', (socket) => {
  console.log(`[Socket] connected: ${socket.id}`);
  
  socket.on('room:join', ({ roomId, playerName }) => {
    const game = games.get(roomId);
    if (!game) {
      socket.emit('room:not_found');
      return;
    }

    // Spieler hinzufügen
    if (game.addPlayer(socket.id, playerName)) {
        socket.join(roomId);
        console.log(`[Game ${roomId}] ${playerName} joined`);
        
        // Allen den neuen Status senden
        game.emitState();
    } else {
        socket.emit('errorNotification', 'Room full or game already started');
    }
  });

  socket.on('game:start', ({ roomId }) => {
      const game = games.get(roomId);
      if (game) game.start();
  });

  socket.on('game:addBot', ({ roomId, difficulty }) => {
      const game = games.get(roomId);
      if (game) {
          game.addBots(1, difficulty); // Add single bot
      }
  });

  socket.on('game:bid', ({ roomId, bid }) => {
      const game = games.get(roomId);
      if (game) game.handleBid(socket.id, bid);
  });

  socket.on('game:play', ({ roomId, cardId }) => {
      const game = games.get(roomId);
      if (game) game.handlePlayCard(socket.id, cardId);
  });

  socket.on('disconnect', () => {
    // Einfache Logik: Spieler entfernen wenn disconnect
    // In Produktion würde man Reconnect-Logik brauchen
    for (const [id, game] of games.entries()) {
        const p = game.players.find(p => p.id === socket.id);
        if (p) {
            game.removePlayer(socket.id);
            if (game.players.length === 0) {
                games.delete(id);
                console.log(`[Game ${id}] closed (empty)`);
            } else {
                game.emitState();
            }
        }
    }
  });
});

// ─── Serve Angular production build ──────────────────────────────────────────
const distPath = path.join(__dirname, 'dist', 'browser');
app.use(express.static(distPath));

app.get('*', (_req, res) => res.sendFile(path.join(distPath, 'index.html')));

server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
