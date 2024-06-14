const fastify = require("fastify")({ logger: false })
const { setIntervalAsync, clearIntervalAsync } = require('set-interval-async');
const { Buffer } = require('buffer');
const conf = require("./config");
const utils = require("./utils");
const cache = require("./cache")

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


        socket.on('message', (message) => {
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

                            //create session
                            let session = cache.sessions.find(e => e.owner == uuid_sub)
                            if (!session) cache.sessions.push({
                                owner: uuid_sub,
                                member: [] // uuid, ws
                            })

                            //add uuid to session
                            cache.sessions.forEach(e => {
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
                            break;
                        default:
                            console.log(messageType)
                    }
                }
            } catch (error) {
                socket.close()
            }
        });

        socket.on('close', (code) => {
            clearIntervalAsync(interval);
            console.warn('Client disconnected code:', code);
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
    console.log("----------------------------------------------\n\nEmulator Figura V2\nBy Kafune CH (MagicLab)\nServer start @ " + "http://localhost:" + conf.port + "\n\n----------------------------------------------\n\n[Console]")
})