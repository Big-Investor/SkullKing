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

function getOpenRooms() {
    return [...games.values()]
        .map(game => game.getPublicRoomInfo())
        .filter(room => room.canJoin)
        .sort((a, b) => b.createdAt - a.createdAt);
}

// ─── REST API ─────────────────────────────────────────────────────────────────
app.post('/api/rooms', (req, res) => {
  const id = crypto.randomBytes(4).toString('hex');
  const requestedModeId = (req.body?.gameModeId ?? '').toString().trim().toLowerCase();
  const gameModeId = Game.isValidGameMode(requestedModeId)
      ? requestedModeId
      : Game.getDefaultGameModeId();
    const ruleSettings = Game.normalizeRuleSettings(req.body?.ruleSettings);
    const game = new Game(id, io, { gameModeId, ruleSettings });
  
  // Optional: Bot Configuration
  if (req.body.withBots && req.body.botCount > 0) {
      game.addBots(req.body.botCount, req.body.difficulty || 'medium');
      console.log(`[Game ${id}] created with mode=${gameModeId}, bots=${req.body.botCount}, rules=${JSON.stringify(ruleSettings)}`);
  } else {
      console.log(`[Game ${id}] created with mode=${gameModeId}, rules=${JSON.stringify(ruleSettings)}`);
  }
  
  games.set(id, game);
  res.status(201).json({ roomId: id, gameModeId, ruleSettings });
});

app.get('/api/game-modes', (_req, res) => {
    res.json({
        defaultGameModeId: Game.getDefaultGameModeId(),
        modes: Game.getAvailableGameModes()
    });
});

app.get('/api/rooms', (_req, res) => {
    res.json(getOpenRooms());
});

app.get('/api/rooms/:id', (req, res) => {
  const checkId = req.params.id.toString().trim().toLowerCase();
  const exists = games.has(checkId);
  console.log(`[API checkRoom] Check ID: '${checkId}', Exists: ${exists}`);
  res.json({ exists: exists });
});

app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));

// ─── User API ─────────────────────────────────────────────────────────────────
app.post('/api/register', (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'Username und Passwort erforderlich' });
    
    const result = userManager.registerUser(username, password);
    if (!result.success) return res.status(400).json({ error: result.message });
    res.json({ success: true, username: result.username });
});

app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'Username und Passwort erforderlich' });
    
    const result = userManager.loginUser(username, password);
    if (!result.success) return res.status(401).json({ error: result.message });
    res.json({ success: true, username: result.username });
});

app.get('/api/leaderboard', (req, res) => {
    res.json(userManager.getLeaderboard());
});

app.get('/api/account/:username', (req, res) => {
    const username = req.params.username;
    if (!username) return res.status(400).json({ error: 'Username erforderlich' });

    const result = userManager.getAccount(username);
    if (!result.success) return res.status(404).json({ error: result.message });
    res.json(result.account);
});

app.post('/api/account/update', (req, res) => {
    const { username, password, newUsername, newPassword } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'Username und Passwort erforderlich' });
    if (!newUsername && !newPassword) return res.status(400).json({ error: 'Keine Änderungen angegeben' });

    const result = userManager.updateAccount(username, password, { newUsername, newPassword });
    if (!result.success) {
        const status = result.code === 'unauthorized' ? 401 : 400;
        return res.status(status).json({ error: result.message });
    }
    res.json({ success: true, username: result.username });
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

    playerName = (playerName ?? '').toString().trim();
    if (playerName.length < 2 || playerName.length > 20) {
        socket.emit('errorNotification', 'Name muss zwischen 2 und 20 Zeichen lang sein.');
        return;
    }

    if (isGuest && userManager.isNameRegistered(playerName)) {
        console.log(`[Join Failed] Guest Name Registered: ${playerName}`);
        socket.emit('errorNotification', 'Dieser Name ist registriert. Bitte wähle einen anderen Namen oder logge dich ein.');
        return;
    }

    const joinResult = game.addHumanPlayer(socket.id, playerName, true);

    if (joinResult.success) {
        socket.join(roomId);
        console.log(`[Game ${roomId}] ${playerName} joined successfully`);

        if (joinResult.replacedBot) {
            io.in(roomId).emit('notification', `${playerName} ersetzt ${joinResult.replacedBotName}.`);
        }
        
        // Allen den neuen Status senden
        game.emitState();
    } else {
        const errorMap = {
            invalid_name: 'Ungültiger Name.',
            name_taken: 'Dieser Name ist in diesem Raum bereits vergeben.',
            room_full: 'Raum ist voll.',
            game_started: 'Spiel läuft bereits.',
            no_bot_to_replace: 'Spiel läuft bereits und es gibt keinen Bot zum Ersetzen.',
            game_finished: 'Spiel ist bereits beendet.'
        };
        const message = errorMap[joinResult.reason] || 'Beitritt nicht möglich.';
        console.log(`[Join Failed] ${playerName}: ${joinResult.reason}`);
        socket.emit('errorNotification', message);
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
