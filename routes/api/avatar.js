const cache = require("../../cache")
const utils = require("../../utils")
const conf = require("../../config")
const fs = require("fs")
const path = require("path")
const playerCache = require("../../middleware/playerCache")
const whitelistCheck = require("../../middleware/whitelist")

const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()
const ratelimit = new Map();
const { sendToast } = require("../../utils")

module.exports = (fastify, opts, done) => {
    //upload avatar
    fastify.put("/avatar", { preHandler: [playerCache, whitelistCheck] }, async (req, res) => {
        const userInfo = req.user["data"];
        const playerRateLimit = ratelimit.get(userInfo.uuid)
        if (playerRateLimit && (playerRateLimit.expired > Date.now() && playerRateLimit.used >= conf.limit.limits.maxAvatars)) {
            console.error(`${userInfo.username} (${userInfo.uuid}) Failed to upload avatar (being ratelimit)`);
            try {
                await sendToast(false, userInfo.username, "Wait a moment!", "you are being ratelimit.", 2)
            } catch (error) {
                console.log(error)
            }
            return res.code(429).send("you are being ratelimit")
        }
        console.info(`${userInfo.username} (${userInfo.uuid}) tried to upload.`);
        const avatarFile = path.join(__dirname, '../../avatars', `${userInfo.uuid}.moon`);
        try {
            await utils.writeFile(avatarFile, req.body)
            return res.send('success');
        } catch (error) {
            console.error(`${userInfo.username} (${userInfo.uuid}) Failed to upload avatar, error`, error);
            return res.code(500).send('Failed to upload avatar.');
        }
    })

    //verify equip
    fastify.post("/equip", { preHandler: [playerCache, whitelistCheck] }, async (req, res) => {
        const playerData = req.user["data"];
        try {
            await prisma.user.update({
                where: {
                    uuid: playerData.uuid
                },
                data: {
                    lastUsed: new Date(),
                }
            })
        } catch (error) {
            console.error(`${playerData.username} (${playerData.uuid}) update database failed.`);
        }

        console.info(`${playerData.username} (${playerData.uuid}) upload successful.`);

        //boardcast all

        if (conf.multiInstant) {
            let self = cache.sessions.find(e => e.uuid == playerData.uuid)
            let localSession = cache.localSessions.get(self.ws)

            if (localSession) {
                localSession.forEach(e => {
                    try {
                        sendEvent(e, playerData.uuid)
                    } catch (error) {
                        console.log("Boardcast equip avatar error", error)
                    }
                })
            }
        } else {
            cache.sessions.forEach(e => {
                if (e.uuid != playerData.uuid) {
                    try {
                        sendEvent(e.ws, playerData.uuid)
                    } catch (error) {
                        console.log("Boardcast equip avatar error", error)
                    }
                }
            })
        }

        //set ratelimit
        const playerRateLimit = ratelimit.get(playerData.uuid)
        console.log(1, playerRateLimit)
        if (playerRateLimit && playerRateLimit?.expired > Date.now()) {
            if (playerRateLimit.used < conf.limit.limits.maxAvatars) {
                ratelimit.set(playerData.uuid, {
                    used: playerRateLimit.used + 1,
                    expired: playerRateLimit.expired
                })
            }
        } else {
            ratelimit.set(playerData.uuid, {
                used: 1,
                expired: Date.now() + (1000 * 60)
            })
        }
        return "ok"
    })

    //delete avatar
    fastify.delete("/avatar", { preHandler: [playerCache] }, async (req, res) => {
        const playerData = req.user["data"];
        fs.unlinkSync(path.join(__dirname, "../../avatars", playerData.uuid + ".moon"))

        //boardcast all
        if (conf.multiInstant) {
            let self = cache.sessions.find(e => e.uuid == playerData.uuid)
            let localSession = cache.localSessions.get(self.ws)

            if (localSession) {
                localSession.forEach(e => {
                    try {
                        sendEvent(e, playerData.uuid)
                    } catch (error) {
                        console.log("Boardcast delete avatar error", error)
                    }
                })
            }
        } else {
            cache.sessions.forEach(e => {
                if (e.uuid != playerData.uuid) {
                    try {
                        sendEvent(e.ws, playerData.uuid)
                    } catch (error) {
                        console.log("Boardcast delete avatar error", error)
                    }
                }
            })
        }
        return "ok"
    })

    //get avatar
    fastify.get("/:uuid/avatar", { preHandler: [playerCache] }, async (req, res) => {
        let uuid = req.params.uuid
        const filePath = path.join(__dirname, '../../avatars', `${uuid}.moon`);
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
    })

    //getuser // check auth
    fastify.get('/:uuid', { preHandler: [playerCache] }, async (req, res) => {
        const uuid = req.params.uuid;
        if (!uuid) {
            return "OK"
        } else {
            const avatarDirectory = path.join(__dirname, '../../avatars');
            const avatarFile = path.join(avatarDirectory, `${uuid}.moon`);

            let userInfoResponse = {
                uuid: uuid,
                rank: 'No whitelist',
                equipped: [],
                equippedBadges: {
                    special: Array(6).fill(0),
                    pride: Array(26).fill(0)
                },
                trust: 2,
                banned: false,
                version: conf.version.release,
                lastUsed: "no whitelist..."
            };

            const playerData = await prisma.user.findFirst({
                where: {
                    uuid: uuid
                }
            }).catch(() => { })
            if (playerData) userInfoResponse = playerData

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
    });
    done()
}

//utils
function sendEvent(socket, uuid) {
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