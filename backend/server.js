const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const crypto = require('crypto');
const Game = require('./classes/Game'); // Importiere Game Logik
const userManager = require('./userManager'); // Import UserManager

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

  // Cleanup timeout in case no actual player joins
  setTimeout(() => {
    const existingGame = games.get(id);
    if (existingGame && existingGame.players.filter(p => !p.isBot).length === 0) {
      games.delete(id);
      console.log(`[Game ${id}] deleted (timeout, no players connected)`);
    }
  }, 120000);
});

app.get('/api/rooms/:id', (req, res) => {
  const checkId = req.params.id.toString().trim().toLowerCase();
  const exists = games.has(checkId);
  console.log(`[API checkRoom] Check ID: '${checkId}', Exists: ${exists}`);
  res.json({ exists: exists });
});

app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));

// ─── User API ─────────────────────────────────────────────────────────────────
app.post('/api/register', async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'Username und Passwort erforderlich' });
    if (typeof username !== 'string' || typeof password !== 'string') return res.status(400).json({ error: 'Ungültiges Format' });
    if (username.length > 30) return res.status(400).json({ error: 'Benutzername zu lang (max. 30 Zeichen)' });
    if (password.length > 100) return res.status(400).json({ error: 'Passwort zu lang (max. 100 Zeichen)' });
    
    const result = await userManager.registerUser(username, password);
    if (!result.success) return res.status(400).json({ error: result.message });
    res.json({ success: true, username: result.username });
});

app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'Username und Passwort erforderlich' });
    if (typeof username !== 'string' || typeof password !== 'string') return res.status(400).json({ error: 'Ungültiges Format' });
    if (username.length > 30) return res.status(400).json({ error: 'Benutzername zu lang (max. 30 Zeichen)' });
    if (password.length > 100) return res.status(400).json({ error: 'Passwort zu lang (max. 100 Zeichen)' });
    
    const result = await userManager.loginUser(username, password);
    if (!result.success) return res.status(401).json({ error: result.message });
    res.json({ success: true, username: result.username });
});

app.get('/api/leaderboard', (req, res) => {
    res.json(userManager.getLeaderboard());
});

// ─── Socket.io ────────────────────────────────────────────────────────────────
io.on('connection', (socket) => {
  console.log(`[Socket] connected: ${socket.id}`);
  
  socket.on('room:join', ({ roomId, playerName, isGuest }) => {
    roomId = roomId.toString().trim().toLowerCase();
    const game = games.get(roomId);
    
    console.log(`[Join Attempt] Room: ${roomId}, Player: ${playerName}, isGuest: ${isGuest}, GameFound: ${!!game}`);

    if (!game) {
      socket.emit('room:not_found');
      return;
    }

    if (isGuest && userManager.isNameRegistered(playerName)) {
        console.log(`[Join Failed] Guest Name Registered: ${playerName}`);
        socket.emit('errorNotification', 'Dieser Name ist registriert. Bitte wähle einen anderen Namen oder logge dich ein.');
        return;
    }

    // Spieler hinzufügen
    if (game.addPlayer(socket.id, playerName)) {
        socket.join(roomId);
        socket.roomId = roomId;
        console.log(`[Game ${roomId}] ${playerName} joined successfully`);
        
        // Allen den neuen Status senden
        game.emitState();
    } else {
        console.log(`[Join Failed] Game addPlayer rejected: ${playerName} (Full or Started)`);
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

  socket.on('game:play', ({ roomId, cardId, playedAs }) => {
      const game = games.get(roomId);
      if (game) game.handlePlayCard(socket.id, cardId, playedAs);
  });

  socket.on('game:pirate_action', ({ roomId, actionData }) => {
      const game = games.get(roomId);
      if (game) game.handlePirateAction(socket.id, actionData);
  });

  socket.on('disconnect', () => {
    // Einfache Logik: Spieler gezielt entfernen wenn disconnect
    if (socket.roomId) {
        const game = games.get(socket.roomId);
        if (game) {
            game.removePlayer(socket.id);
            if (game.players.length === 0) {
                games.delete(socket.roomId);
                console.log(`[Game ${socket.roomId}] closed (empty)`);
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
