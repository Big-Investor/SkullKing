const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const dataFile = path.join(__dirname, 'data', 'users.json');

let users = {};

function loadUsers() {
    try {
        if (fs.existsSync(dataFile)) {
            users = JSON.parse(fs.readFileSync(dataFile, 'utf8'));
        } else {
            users = {};
        }
    } catch (e) {
        console.error('Error loading users:', e);
        users = {};
    }
}

function saveUsers() {
    try {
        fs.writeFileSync(dataFile, JSON.stringify(users, null, 2), 'utf8');
    } catch (e) {
        console.error('Error saving users:', e);
    }
}

function hashPassword(password) {
    return crypto.createHash('sha256').update(password).digest('hex');
}

function registerUser(username, password) {
    username = username.trim();
    const lowerName = username.toLowerCase();
    
    // Check if exists
    for (const key of Object.keys(users)) {
        if (key.toLowerCase() === lowerName) {
            return { success: false, message: 'Benutzername ist bereits vergeben.' };
        }
    }

    users[username] = {
        password: hashPassword(password),
        gamesPlayed: 0,
        gamesWon: 0,
        totalScore: 0
    };
    saveUsers();
    return { success: true, username };
}

function loginUser(username, password) {
    username = username.trim();
    const lowerName = username.toLowerCase();
    
    for (const key of Object.keys(users)) {
        if (key.toLowerCase() === lowerName) {
            if (users[key].password === hashPassword(password)) {
                return { success: true, username: key };
            } else {
                return { success: false, message: 'Falsches Passwort.' };
            }
        }
    }
    return { success: false, message: 'Benutzer nicht gefunden.' };
}

function isNameRegistered(username) {
    const lowerName = username.trim().toLowerCase();
    for (const key of Object.keys(users)) {
        if (key.toLowerCase() === lowerName) {
            return true;
        }
    }
    return false;
}

function updateStats(username, score, isWinner) {
    if (!users[username]) return; // Guest or bot
    users[username].gamesPlayed += 1;
    users[username].totalScore += score;
    if (isWinner) {
        users[username].gamesWon += 1;
    }
    saveUsers();
}

function getLeaderboard() {
    const arr = Object.keys(users).map(name => ({
        username: name,
        gamesPlayed: users[name].gamesPlayed,
        gamesWon: users[name].gamesWon,
        totalScore: users[name].totalScore
    }));
    
    // Sort by gamesWon desc, then totalScore desc
    arr.sort((a, b) => {
        if (b.gamesWon !== a.gamesWon) return b.gamesWon - a.gamesWon;
        return b.totalScore - a.totalScore;
    });
    
    return arr;
}

// Load on start
loadUsers();

module.exports = {
    registerUser,
    loginUser,
    isNameRegistered,
    updateStats,
    getLeaderboard
};