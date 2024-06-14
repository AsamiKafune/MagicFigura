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

module.exports = {
    generateHexString,
    calculateFileSHA256,
    parseUUID
}