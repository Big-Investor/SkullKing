const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const USERNAME_MIN_LEN = 2;
const USERNAME_MAX_LEN = 20;

const dataDir = path.join(__dirname, 'data');
const dataFile = path.join(dataDir, 'users.json');
const tmpFile = path.join(dataDir, 'users.json.tmp');

let users = {};

function normalizeUsername(username) {
    return (username ?? '').toString().trim();
}

function validateUsername(username) {
    const trimmed = normalizeUsername(username);
    if (trimmed.length < USERNAME_MIN_LEN) {
        return { ok: false, message: `Benutzername muss mindestens ${USERNAME_MIN_LEN} Zeichen haben.` };
    }
    if (trimmed.length > USERNAME_MAX_LEN) {
        return { ok: false, message: `Benutzername darf maximal ${USERNAME_MAX_LEN} Zeichen haben.` };
    }
    return { ok: true, username: trimmed };
}

function ensureDataDir() {
    if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
    }
}

function findUserKeyInsensitive(username) {
    const lowerName = normalizeUsername(username).toLowerCase();
    for (const key of Object.keys(users)) {
        if (key.toLowerCase() === lowerName) return key;
    }
    return null;
}

function loadUsers() {
    try {
        ensureDataDir();

        if (!fs.existsSync(dataFile)) {
            users = {};
            return;
        }

        let raw = fs.readFileSync(dataFile, 'utf8');
        raw = raw.replace(/^\uFEFF/, '');
        const parsed = raw.trim() ? JSON.parse(raw) : {};
        users = (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) ? parsed : {};
    } catch (e) {
        console.error('Error loading users:', e);
        users = {};
    }
}

function saveUsers() {
    try {
        ensureDataDir();

        const payload = JSON.stringify(users, null, 2);
        fs.writeFileSync(tmpFile, payload, 'utf8');

        try {
            // On Linux this replaces atomically; on Windows it can fail if dest exists.
            fs.renameSync(tmpFile, dataFile);
        } catch (_renameErr) {
            // Windows fallback: overwrite target, then delete tmp.
            fs.copyFileSync(tmpFile, dataFile);
            fs.unlinkSync(tmpFile);
        }
    } catch (e) {
        console.error('Error saving users:', e);
    }
}

function hashPassword(password) {
    return crypto.createHash('sha256').update(password).digest('hex');
}
function registerUser(username, password) {
    const validation = validateUsername(username);
    if (!validation.ok) return { success: false, message: validation.message };

    const trimmed = validation.username;
    if (!password) return { success: false, message: 'Passwort erforderlich.' };

    // Check if exists (case-insensitive)
    if (findUserKeyInsensitive(trimmed)) {
        return { success: false, message: 'Benutzername ist bereits vergeben.' };
    }

    users[trimmed] = {
        password: hashPassword(password),
        gamesPlayed: 0,
        gamesWon: 0,
        totalScore: 0
    };
    saveUsers();
    return { success: true, username: trimmed };
}

function loginUser(username, password) {
    const key = findUserKeyInsensitive(username);
    if (!key) return { success: false, message: 'Benutzer nicht gefunden.' };

    if (users[key].password === hashPassword(password)) {
        return { success: true, username: key };
    }
    return { success: false, message: 'Falsches Passwort.' };
}

function isNameRegistered(username) {
    return !!findUserKeyInsensitive(username);
}

function getAccount(username) {
    const key = findUserKeyInsensitive(username);
    if (!key) return { success: false, message: 'Benutzer nicht gefunden.' };

    return {
        success: true,
        account: {
            username: key,
            gamesPlayed: users[key].gamesPlayed,
            gamesWon: users[key].gamesWon,
            totalScore: users[key].totalScore
        }
    };
}

function updateAccount(username, password, { newUsername, newPassword } = {}) {
    const currentKey = findUserKeyInsensitive(username);
    if (!currentKey) return { success: false, code: 'not_found', message: 'Benutzer nicht gefunden.' };

    if (users[currentKey].password !== hashPassword(password)) {
        return { success: false, code: 'unauthorized', message: 'Falsches Passwort.' };
    }

    let targetKey = currentKey;

    const newUsernameNormalized = normalizeUsername(newUsername);
    if (newUsernameNormalized) {
        const validation = validateUsername(newUsernameNormalized);
        if (!validation.ok) return { success: false, code: 'bad_request', message: validation.message };

        const requestedKey = validation.username;
        const requestedLower = requestedKey.toLowerCase();

        if (requestedLower !== currentKey.toLowerCase()) {
            if (findUserKeyInsensitive(requestedKey)) {
                return { success: false, code: 'conflict', message: 'Benutzername ist bereits vergeben.' };
            }
        }

        if (requestedKey !== currentKey) {
            users[requestedKey] = users[currentKey];
            delete users[currentKey];
            targetKey = requestedKey;
        }
    }

    const newPasswordNormalized = (newPassword ?? '').toString();
    if (newPasswordNormalized) {
        users[targetKey].password = hashPassword(newPasswordNormalized);
    }

    saveUsers();
    return { success: true, username: targetKey };
}

function updateStats(username, score, isWinner) {
    const key = findUserKeyInsensitive(username);
    if (!key) return; // Guest or bot
    users[key].gamesPlayed += 1;
    users[key].totalScore += score;
    if (isWinner) {
        users[key].gamesWon += 1;
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
    getAccount,
    updateAccount,
    updateStats,
    getLeaderboard
};