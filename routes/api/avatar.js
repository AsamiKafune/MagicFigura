const cache = require("../../cache")
const utils = require("../../utils")
const conf = require("../../config")
const fs = require("fs")
const path = require("path")
const playerCache = require("../../middleware/playerCache")

module.exports = (fastify, opts, done) => {
    //upload avatar
    fastify.put("/avatar", { preHandler: [playerCache] }, async (req, res) => {
        const userInfo = req.user["data"];
        if (userInfo) {
            console.info(`${userInfo.username} (${userInfo.uuid}) tried to upload`);
            const avatarFile = path.join(__dirname, '../../avatars', `${userInfo.uuid}.moon`);
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
    fastify.post("/equip", { preHandler: [playerCache] }, async (req, res) => {
        const playerData = req.user["data"];
        let bc = cache.sessions.find(e => e.owner == playerData.uuid)
        bc.member.forEach(e => {
            sendEvent(e.ws, playerData.uuid)
        })
        return "ok"
    })

    //delete avatar
    fastify.delete("/avatar", { preHandler: [playerCache] }, async (req, res) => {
        const playerData = req.user["data"];
        fs.unlinkSync(path.join(__dirname, "../../avatars", playerData.uuid + ".moon"))

        let bc = cache.sessions.find(e => e.owner == playerData.uuid)
        bc.member.forEach(e => {
            sendEvent(e.ws, playerData.uuid)
        })
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
                rank: 'default',
                equipped: [],
                equippedBadges: {
                    special: Array(6).fill(0),
                    pride: Array(26).fill(0)
                },
                banned: false,
                version: conf.version.release,
                lastUsed: new Date()
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