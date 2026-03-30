const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const dataFile = path.join(__dirname, 'data', 'users.json');

let users = Object.create(null);

function loadUsers() {
    try {
        if (fs.existsSync(dataFile)) {
            const data = JSON.parse(fs.readFileSync(dataFile, 'utf8'));
            users = Object.create(null);
            Object.assign(users, data);
        } else {
            users = Object.create(null);
        }
    } catch (e) {
        console.error('Error loading users:', e);
        users = Object.create(null);
    }
}

async function saveUsers() {
    try {
        const dir = path.dirname(dataFile);
        if (!fs.existsSync(dir)) {
            await fs.promises.mkdir(dir, { recursive: true });
        }
        await fs.promises.writeFile(dataFile, JSON.stringify(users, null, 2), 'utf8');
    } catch (e) {
        console.error('Error saving users:', e);    }
}

function hashPassword(password, salt) {
    if (!salt) {
        salt = crypto.randomBytes(16).toString('hex');
    }
    const hash = crypto.scryptSync(password, salt, 64).toString('hex');
    return `${salt}:${hash}`;
}

function verifyPassword(password, storedHash) {
    const parts = storedHash.split(':');
    if (parts.length !== 2) {
        // Fallback for old simple hashes
        const oldHash = crypto.createHash('sha256').update(password).digest('hex');
        return oldHash === storedHash;
    }
    const salt = parts[0];
    const newHash = hashPassword(password, salt);
    return newHash === storedHash;
}

async function registerUser(username, password) {
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
    await saveUsers();
    return { success: true, username };
}

async function loginUser(username, password) {
    username = username.trim();
    const lowerName = username.toLowerCase();
    
    for (const key of Object.keys(users)) {
        if (key.toLowerCase() === lowerName) {
            if (verifyPassword(password, users[key].password)) {
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

async function updateStats(username, score, isWinner) {
    if (!users[username]) return; // Guest or bot
    users[username].gamesPlayed += 1;
    users[username].totalScore += score;
    if (isWinner) {
        users[username].gamesWon += 1;
    }
    await saveUsers();
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