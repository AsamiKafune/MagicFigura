const fastify = require("fastify")({ logger: false })
const { setIntervalAsync, clearIntervalAsync } = require('set-interval-async');
const { Buffer } = require('buffer');
const conf = require("./config");
const utils = require("./utils");
const cache = require("./cache");

//cors origin bypass
fastify.options('*', function (request, reply) {
    reply.send()
});

fastify.addHook('onSend', (req, res, payload, next) => {

    console.info("Request ->", req.raw.url)

    res.header('Access-Control-Allow-Origin', '*')
    res.header('Access-Control-Allow-Headers', '*')
    next()
});

//custom plugin fastify
fastify.register(require('@fastify/websocket'))

fastify.register(require('@fastify/multipart'), {
    limits: {
        fieldNameSize: 100,
        fieldSize: 100,
        fields: 10,
        fileSize: conf.limit.limits.maxAvatarSize,
        files: 1,
        headerPairs: 2000,
        parts: 5
    }
});

//support file octet-stream
fastify.addContentTypeParser('application/octet-stream', { parseAs: 'buffer' }, (req, body, done) => {
    done(null, body);
});

require("./routes")(fastify)

//get welcome message
fastify.get("/", async () => {
    return conf.welcomeMessage
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


        socket.on('message', async (message) => {
            try {
                if (Buffer.isBuffer(message)) {
                    const bytes = new Uint8Array(message)
                    const buffer = new DataView(bytes.buffer);
                    let offset = 0;
                    const messageType = buffer.getUint8(offset);
                    offset += 1;

                    if (messageType == utils.ENUM.C2S.TOKEN) {
                        const token = new TextDecoder().decode(buffer.buffer.slice(offset));
                        const player = cache.players[token]

                        //auth and create sessions
                        if (player) {
                            console.log(player.username, "-> connect to MagicFigura successful.")

                            cache.wsData.set(socket, player.uuid)
                            cache.sessions.push({
                                username: player.username,
                                uuid: player.uuid,
                                ws: socket
                            })
                            socket.send(Buffer.from([0]))
                        }
                    } else if (messageType == utils.ENUM.C2S.PING) {
                        const uuid = cache.wsData.get(socket);
                        const bytesToReplace = Buffer.from(buffer.buffer.slice(1));

                        let bbf = new ArrayBuffer(6);
                        let bbfv = new DataView(bbf);

                        for (var i = 0; i < 6; i++) {
                            bbfv.setInt8(i, bytesToReplace[i]);
                        }

                        const buf2 = Buffer.alloc(1 + 16 + bbfv.byteLength)
                        buf2.writeUint8(1, 0);
                        const uuidb = Buffer.from(uuid.replace(/-/g, ''), 'hex');
                        uuidb.copy(buf2, 1)
                        Buffer.from(new Uint8Array(bbfv.buffer)).copy(buf2, 17);

                        const bc = cache.localSessions.get(socket)
                        if (bc) {
                            bc.forEach(e => {
                                e.send(buf2)
                            })
                        }
                    } else if (messageType == utils.ENUM.C2S.SUB) {
                        const uuidHigh = buffer.getBigUint64(offset);
                        offset += 8;
                        const uuidLow = buffer.getBigUint64(offset);
                        const hh = uuidHigh.toString(16).padStart(16, '0');
                        const lh = uuidLow.toString(16).padStart(16, '0');
                        const uuid_sub = utils.parseUUID(hh + lh)

                        let self = cache.localSessions.get(socket)
                        const target = (cache.sessions.find(e => (e.uuid == uuid_sub) && (e.ws != socket)))?.ws
                        if (target) {
                            //self register
                            if (!self) self = []
                            self.push(target)
                            cache.localSessions.set(socket, self)

                            //everyclient register
                            let targetPlayer = cache.localSessions.get(target)
                            if (!targetPlayer) targetPlayer = []
                            targetPlayer.push(socket)
                            cache.localSessions.set(target, targetPlayer)
                        }
                    } else if (messageType == utils.ENUM.C2S.UNSUB) {
                        const uuidHigh = buffer.getBigUint64(offset);
                        offset += 8;
                        const uuidLow = buffer.getBigUint64(offset);
                        const hh = uuidHigh.toString(16).padStart(16, '0');
                        const lh = uuidLow.toString(16).padStart(16, '0');
                        const uuid_unsub = utils.parseUUID(hh + lh)

                        // remove self
                        cache.localSessions.delete(socket)

                        //everyclient remove unsub from session
                        const target = (cache.sessions.find(e => (e.uuid == uuid_unsub) && (e.ws != socket)))?.ws
                        if (target) {
                            let session = cache.localSessions.get(target)
                            if (!session) session = []
                            session = session.filter(e => e != socket)
                            cache.localSessions.set(target, session)
                        }
                    }
                    else {
                        console.log(messageType)
                    }
                }
            } catch (error) {
                console.error(error)
                socket.close()
            }
        });

        socket.on('close', (code) => {
            clearIntervalAsync(interval);
            removeSession(socket)
        });

        socket.on('error', (error) => {
            clearIntervalAsync(interval);
            removeSession(socket)
            console.error('WebSocket error:', error);
        });

    })
})

function removeSession(socket) {
    cache.wsData.delete(socket);
    cache.sessions = cache.sessions.filter(e => e.ws != socket) // remove session when close game
    cache.localSessions.delete(socket) // remove localSessions when close game
}

fastify.listen({
    port: conf.port,
    host: conf.host
}).then(() => {
    console.log("----------------------------------------------\n\nEmulator Figura V2\nBy Kafune CH (MagicLab)\nServer start @ " + "http://localhost:" + conf.port + "\n\n----------------------------------------------\n\n[Console]")
})