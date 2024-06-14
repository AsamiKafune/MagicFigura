const crypto = require('crypto');
const fs = require("fs")
const { stringify: uuidStringify } = require('uuid');

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
    ENUM
}