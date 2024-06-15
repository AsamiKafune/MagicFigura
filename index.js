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

                    switch (messageType) {
                        case utils.ENUM.C2S.TOKEN:
                            var token = new TextDecoder().decode(buffer.buffer.slice(offset));
                            let playerData = cache.players[token]

                            //auth and create sessions
                            if (playerData) {
                                console.log(playerData.username, "-> connect to MagicFigura successful.")

                                cache.wsData.set(socket, playerData.uuid)
                                cache.sessions.push({
                                    username: playerData.username,
                                    uuid: playerData.uuid,
                                    ws: socket
                                })
                                socket.send(Buffer.from([0]))
                            }

                            break;
                        case utils.ENUM.C2S.PING:
                            var wsIdentify = cache.wsData.get(socket);
                            var existingBuffer = buffer.buffer;
                            var bytesToReplace = Buffer.from(existingBuffer.slice(1));

                            var bbf = new ArrayBuffer(6);
                            var bbfv = new DataView(bbf);

                            for (var i = 0; i < 6; i++) {
                                bbfv.setInt8(i, bytesToReplace[i]);
                            }

                            var data = bbfv;
                            var buf2 = Buffer.alloc(1 + 16 + data.byteLength)
                            buf2.writeUint8(1, 0);
                            uuidb = Buffer.from(wsIdentify.replace(/-/g, ''), 'hex');
                            uuidb.copy(buf2, 1)
                            Buffer.from(new Uint8Array(data.buffer)).copy(buf2, 17);
                            cache.sessions.forEach(e => {
                                if (e.uuid != wsIdentify) e.ws.send(buf2)
                            })

                            break;
                        case utils.ENUM.C2S.SUB:
                            var uuidHigh = buffer.getBigUint64(offset);
                            offset += 8;
                            var uuidLow = buffer.getBigUint64(offset);
                            var hh = uuidHigh.toString(16).padStart(16, '0');
                            var lh = uuidLow.toString(16).padStart(16, '0');
                            let uuid_sub = utils.parseUUID(hh + lh)
                            console.log(uuid_sub)
                            break;
                        case utils.ENUM.C2S.UNSUB:
                            var uuidHigh = buffer.getBigUint64(offset);
                            offset += 8;
                            var uuidLow = buffer.getBigUint64(offset);
                            var hh = uuidHigh.toString(16).padStart(16, '0');
                            var lh = uuidLow.toString(16).padStart(16, '0');
                            let uuid_unsub = utils.parseUUID(hh + lh)
                            console.log(uuid_unsub)
                            break;
                        default:
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
}

fastify.listen({
    port: conf.port,
    host: conf.host
}).then(() => {
    console.log("----------------------------------------------\n\nEmulator Figura V2\nBy Kafune CH (MagicLab)\nServer start @ " + "http://localhost:" + conf.port + "\n\n----------------------------------------------\n\n[Console]")
})