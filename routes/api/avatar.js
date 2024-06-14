const cache = require("../../cache")
const utils = require("../../utlis")
const fs = require("fs")
const path = require("path")

module.exports = (fastify, opts, done) => {
    //upload avatar
    fastify.put("/avatar", async (req, res) => {
        const token = req.headers['token'];
        if (!token) {
            return res.code(400).send('Token is required');
        }
        let userInfo = cache.players[token];

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
    fastify.post("/equip", async (req, res) => {
        const token = req.headers["token"];
        if (cache.players[token]) {

            let bc = cache.sessions.find(e => e.owner == cache.players[token].uuid)
            bc.member.forEach(e => {
                sendEvent(e.ws, cache.players[token].uuid)
            })

            return "ok"
        } else {
            return res.code(401).send("unauthorized")
        }
    })

    //delete avatar
    fastify.delete("/avatar", async (req, res) => {
        const token = req.headers["token"];
        const playerData = cache.players[token];
        if (playerData) {
            fs.unlinkSync(path.join(__dirname, "../../avatars" , playerData.uuid + ".moon"))

            let bc = cache.sessions.find(e => e.owner == cache.players[token].uuid)
            bc.member.forEach(e => {
                sendEvent(e.ws, cache.players[token].uuid)
            })
            return "ok"
        } else {
            return res.code(401).send("unauthorized")
        }
    })

    //get avatar
    fastify.get("/:uuid/avatar", async (req, res) => {
        const token = req.headers["token"]
        const playerData = cache.players[token];

        if (playerData) {
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
        } else {
            res.code(401).send("unauthorized");
        }


    })

    //getuser // check auth
    fastify.get('/:uuid', async (req, res) => {
        const uuid = req.params.uuid;
        const token = req.headers["token"];
        const selfData = cache.players[token];
        if (selfData) {
            if (!uuid) {
                return "OK"
            } else {
                const avatarDirectory = path.join(__dirname, '../../avatars');
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
    done()
}

//utils
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