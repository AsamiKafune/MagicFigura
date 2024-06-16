const crypto = require('crypto');
const fs = require("fs")
const { stringify: uuidStringify } = require('uuid');
const cache = require("../cache")

async function generateHexString(length) {
    return crypto.randomBytes(length).toString('hex');
}

async function calculateFileSHA256(filePath) {
    const hash = crypto.createHash('sha256');
    const stream = fs.createReadStream(filePath);
    return new Promise((resolve, reject) => {
        stream.on('data', data => hash.update(data));
        stream.on('end', () => resolve(hash.digest('hex')));
        stream.on('error', error => reject(error));
    });
}

function parseUUID(string) {
    const bytes = Buffer.from(string, 'hex');
    const uuid = uuidStringify(bytes);

    return uuid;
}

function convertObjectToArray(obj) {
    const resultArray = [];

    for (const [hash, userDetails] of Object.entries(obj)) {
        resultArray.push({
            hash: hash,
            uuid: userDetails.uuid,
            username: userDetails.username
        });
    }

    return resultArray;
}

async function sendChat(boardcast = false, username, message) {
    const eventType = 4; // client type (toast)
    if (!message || (!boardcast && !username)) return false;

    try {
        //create buffer
        const messageBuffer = Buffer.from(message, 'utf-8');
        const buf = Buffer.alloc(1 + messageBuffer.length);
        buf.writeUInt8(eventType, 0);
        messageBuffer.copy(buf, 1);

        if (boardcast) {
            cache.sessions.forEach(e => {
                e.ws.send(buf)
            })
        } else {
            const player = cache.sessions.find(e => e.username == username);
            if (!player) return false;
            player.ws.send(buf)
        }
    } catch (error) {
        console.error("Chat error", error)
        return false
    }
    return true;
}

async function sendToast(boardcast = false, username, title, message, type = 0) {
    const eventType = 3; // client type (toast)
    if (!title || !message || (!boardcast && !username)) return false;

    try {
        //create buffer
        const messageBuffer = Buffer.from(title + '\0' + message, 'utf-8');
        const buf = Buffer.alloc(1 + 1 + messageBuffer.length);
        buf.writeUInt8(eventType, 0);
        buf.writeUInt8(parseInt(type), 1);
        messageBuffer.copy(buf, 2);

        if (boardcast) {
            cache.sessions.forEach(e => {
                e.ws.send(buf)
            })
        } else {
            const player = cache.sessions.find(e => e.username == username);
            if (!player) return false;
            player.ws.send(buf)
        }
    } catch (error) {
        console.error("Toast error", error)
        return false
    }
    return true;
}

async function sendNotice(boardcast = false, username, type = 0) {
    const eventType = 5; // client type (notice)
    if (!boardcast && !username) return false;

    try {
        //create buffer
        const buf = Buffer.alloc(1 + 1);
        buf.writeUInt8(eventType, 0);
        buf.writeUInt8(parseInt(type), 1);

        if (boardcast) {
            cache.sessions.forEach(e => {
                e.ws.send(buf)
            })
        } else {
            const player = cache.sessions.find(e => e.username == username);
            if (!player) return false;
            player.ws.send(buf)
        }
    } catch (error) {
        console.error("Notice error", error)
        return false
    }
    return true;
}

const writeFile = (path, data) =>
    new Promise((resolve, reject) => {
        fs.writeFile(path, data, (err) => {
            if (err) reject(err)
            else resolve()
        })
    })

const ENUM = {
    C2S: {
        TOKEN: 0,
        PING: 1,
        SUB: 2,
        UNSUB: 3,
    },
    S2C: {
        AUTH: 0,
        PING: 1,
        EVENT: 2,
        TOAST: 3,
        CHAT: 4,
        NOTICE: 5,
    }
}

module.exports = {
    convertObjectToArray,
    generateHexString,
    calculateFileSHA256,
    parseUUID,
    writeFile,
    sendToast,
    sendNotice,
    sendChat,
    ENUM
}