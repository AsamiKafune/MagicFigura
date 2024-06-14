const fastify = require("fastify")({ logger: false })
const { setIntervalAsync, clearIntervalAsync } = require('set-interval-async');
const { Buffer } = require('buffer');
const fs = require("fs");
const axios = require("axios");
const path = require("path");

const conf = require("./config");
const utils = require("./utlis");

function sendEvent(socket, uuid){
    var parts = uuid.split('-');
    var hh = parts[0] + parts[1] + parts[2]
    var lh = parts[3] + parts[4]
    var uuidHigh = BigInt('0x' + hh);
    var uuidLow = BigInt('0x' + lh);

    let buffer = new ArrayBuffer(17);
    let bbuffer = new DataView(buffer);

    let offset = 0
    bbuffer.setUint8(offset, utils.ENUM.S2C.EVENT);
    offset += 1;
    bbuffer.setBigUint64(offset, uuidHigh);
    offset += 8;
    bbuffer.setBigUint64(offset, uuidLow);

    socket.send(buffer);
}

//cors origin bypass
fastify.options('*', function (request, reply) {
    reply.send()
});

fastify.addHook('onSend', function (request, reply, payload, next) {
    reply.header('Access-Control-Allow-Origin', '*')
    reply.header('Access-Control-Allow-Headers', '*')
    next()
});

//custom plugin fastify
fastify.register(require('@fastify/websocket'))

fastify.register(require('@fastify/multipart'), {
    limits: {
        fieldNameSize: 100,
        fieldSize: 100,
        fields: 10,
        fileSize: 1000000,
        files: 1,
        headerPairs: 2000,
        parts: 5
    }
});

//support file octet-stream
fastify.addContentTypeParser('application/octet-stream', { parseAs: 'buffer' }, (req, body, done) => {
    done(null, body);
});

//get welcome message
fastify.get("/", async () => {
    return conf.welcomeMessage
})

//get current version
fastify.get("/api/version", async (req, res) => {
    return conf.version
})

//get motd
fastify.get("/api/motd", async (req, res) => {
    return conf.motd
})

//get limit upload
fastify.get("/api/limits", async (req, res) => {
    return conf.limit
})

//cache
let serverIds = {};
let players = {};
let sessions = [];

//get serverid for verify
fastify.get("/api//auth/id", async (req, res) => {
    let server_id = await utils.generateHexString(16);
    let username = req.query["username"];
    if (!username) {
        return res.code(400).send("Username is required")
    }
    serverIds[server_id] = username;
    return res.send(server_id);
})

//verify account
fastify.get("/api//auth/verify", async (req, res) => {
    let token = await utils.generateHexString(16);
    const serverId = req.query["id"];

    if (serverIds[serverId]) {
        const authUsername = serverIds[serverId];
        const requestUrl = `https://sessionserver.mojang.com/session/minecraft/hasJoined?username=${authUsername}&serverId=${serverId}`;

        try {
            const raw = await axios.get(requestUrl);
            const r = raw.data;

            if (raw.status !== 200) {
                return res.code(500).send('Failed to retrieve data from the "Mojang" API');
            }

            players[token] = {
                uuid: utils.parseUUID(r.id),
                username: r.name
            };

            return res.send(token);
        } catch (error) {
            console.error(error);
            return res.code(500).send('Failed to send request or parse response');
        }
    } else {
        return res.code(404).send('Failed to authenticate');
    }
})

//upload avatar
fastify.put("/api/avatar", async (req, res) => {
    const token = req.headers['token'];
    if (!token) {
        return res.code(400).send('Token is required');
    }
    let userInfo = players[token];

    if (userInfo) {
        console.info(`${userInfo.username} (${userInfo.uuid}) tried to upload`);
        const avatarFile = path.join(__dirname, 'avatars', `${userInfo.uuid}.moon`);
        try {
            await fs.promises.writeFile(avatarFile, req.body);
            return res.send('success');
        } catch (error) {
            console.error(error);
            return res.code(500).send('Failed to upload avatar');
        }
    } else {
        return res.code(401).send('Unauthorized');
    }
})

//verify equip
fastify.post("/api/equip", async (req, res) => {
    const token = req.headers["token"];
    if (players[token]) {

        //boardcast logic
        let bc = sessions.find(e => e.owner == players[token].uuid)
        bc.member.forEach(e => {
            sendEvent(e.ws, players[token].uuid)
        })
        

        return "ok"
    } else {
        return res.code(401).send("unauthorized")
    }
})

//delete avatar
fastify.delete("/api/avatar", async (req, res) => {
    const token = req.headers["token"];
    const playerData = players[token];
    if (playerData) {
        fs.unlinkSync(path.join(__dirname, "avatars/" + playerData.uuid + ".moon"))

        let bc = sessions.find(e => e.owner == players[token].uuid)
        bc.member.forEach(e => {
            sendEvent(e.ws, players[token].uuid)
        })
        //boardcast logic
        return "ok"
    } else {
        return res.code(401).send("unauthorized")
    }
})

//get avatar
fastify.get("/api/:uuid/avatar", async (req, res) => {
    const token = req.headers["token"]
    const playerData = players[token];

    if (playerData) {
        let uuid = req.params.uuid
        const filePath = path.join(__dirname, 'avatars', `${uuid}.moon`);
        try {
            const buffer = fs.readFileSync(filePath);
            res.header('Content-Disposition', 'attachment; filename=' + `${uuid}.moon`);
            res.header('Content-Type', 'application/octet-stream');
            res.send(buffer);
        } catch (err) {
            if (err.code === 'ENOENT') {
                res.code(404).send('Avatar not found');
            } else {
                res.code(500).send('Internal Server Error');
            }
        }
    } else {
        res.code(401).send("unauthorized");
    }


})

//getuser // check auth
fastify.get('/api/:uuid', async (req, res) => {
    const uuid = req.params.uuid;
    const token = req.headers["token"];
    const selfData = players[token];
    if (selfData) {
        if (!uuid) {
            return "OK"
        } else {
            const avatarDirectory = path.join(__dirname, 'avatars');
            const avatarFile = path.join(avatarDirectory, `${uuid}.moon`);

            let userInfoResponse = {
                _id: "6622841839ee601cae970e95", // mongodb id i thing useless
                uuid: uuid,
                rank: 'default',
                equipped: [],
                equippedBadges: {
                    special: Array(6).fill(0),
                    pride: Array(26).fill(0)
                },
                banned: false,
                version: 'Devmode',
                lastUsed: new Date() // format 2024-06-14T00:45:46.917Z
            };

            try {
                const file = fs.statSync(avatarFile)
                if (file) {
                    const hash = await utils.calculateFileSHA256(avatarFile);
                    userInfoResponse.equipped.push({
                        id: 'avatar',
                        owner: uuid,
                        hash: hash
                    });
                } else {
                    // do not do anything.
                }
            } catch (err) {
                // do not do anything.
            }
            return userInfoResponse
        }
    } else {
        return res.code(401).send("unauthorized")
    }
});

//ws stuff (get sessions dev_only)
fastify.get("/get/serverinfo", async (req, res) => {
    if(req.headers.pass != "1234") return {}
    let _sessions = sessions.map(e => {
        return {
            owner: e.owner,
            member: e.member.map(_ => _.uuid)
        };
    });
    return {
        sessions : _sessions,
        serverIds,
        players
    }
})

//ws stuff
fastify.register(async function (fastify) {
    fastify.get('/ws', { websocket: true }, (socket, req) => {

        let pingTimes = 0;
        const interval = setIntervalAsync(async () => {
            if (socket.readyState === socket.OPEN) {
                socket.ping(Buffer.from(pingTimes.toString()));

                const msgString = `Test ping ${pingTimes}`;
                const buffer = Buffer.alloc(1 + msgString.length + 1);
                buffer.writeUInt8(4, 0);
                buffer.write(msgString, 1);
                buffer.writeUInt8(0, 1 + msgString.length);

                pingTimes++;
            }
        }, 2000);


        socket.on('message', (message) => {
            if (Buffer.isBuffer(message)) {
                const bytes = new Uint8Array(message)
                const buffer = new DataView(bytes.buffer);
                let offset = 0;
                const messageType = buffer.getUint8(offset);
                offset += 1;

                switch (messageType) {
                    case utils.ENUM.C2S.TOKEN:
                        var token = new TextDecoder().decode(buffer.buffer.slice(offset));
                        let playerData = players[token]

                        //auth and create sessions
                        if (playerData) {
                            console.log("TOKEN: ", token + " auth ws successful!")
                            socket.send(Buffer.from([0]))
                        }
                        break;
                    case utils.ENUM.C2S.PING:
                        console.log(bytes)
                        break;
                    case utils.ENUM.C2S.SUB:
                        var uuidHigh = buffer.getBigUint64(offset);
                        offset += 8;
                        var uuidLow = buffer.getBigUint64(offset);

                        var hh = uuidHigh.toString(16).padStart(16, '0');
                        var lh = uuidLow.toString(16).padStart(16, '0');

                        let uuid_sub = (hh.slice(0, 8) + '-' + hh.slice(8, 12) + '-' + hh.slice(12, 16) + '-' + lh.slice(0, 4) + '-' + lh.slice(4))

                        console.log("Subscribe UUID: ", uuid_sub)

                        //create session
                        let session = sessions.find(e => e.owner == uuid_sub)
                        if (!session) sessions.push({
                            owner: uuid_sub,
                            member: [] // uuid, ws
                        })

                        //add uuid to session
                        sessions.forEach(e => {
                            if (e.owner != uuid_sub && !e.member.find(_ => _.uuid == uuid_sub)) {
                                e.member.push({
                                    ws: socket,
                                    uuid: uuid_sub
                                })
                            }
                        })
                        break;
                    case utils.ENUM.C2S.UNSUB:
                        var uuidHigh = buffer.getBigUint64(offset);
                        offset += 8;
                        var uuidLow = buffer.getBigUint64(offset);
                        var hh = uuidHigh.toString(16).padStart(16, '0');
                        var lh = uuidLow.toString(16).padStart(16, '0');

                        let uuid_unsub = (hh.slice(0, 8) + '-' + hh.slice(8, 12) + '-' + hh.slice(12, 16) + '-' + lh.slice(0, 4) + '-' + lh.slice(4))
                        console.log("Remove uuid: " + uuid_unsub + " from websocket")
                        break;
                    default:
                        console.log(messageType)
                }
            }
        });

        socket.on('close', () => {
            clearIntervalAsync(interval);
            console.log('Client disconnected');
        });

        socket.on('error', (error) => {
            clearIntervalAsync(interval);
            console.error('WebSocket error:', error);
        });

    })
})

fastify.listen({
    port: conf.port,
    host: conf.host
}).then(() => {
    console.log("----------------------------------------------\n\nEmulator Figura V2\nstart @ " + "http://localhost:" + conf.port + "\n\n----------------------------------------------\n\n[Console]")
})