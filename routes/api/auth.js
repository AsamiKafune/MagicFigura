const cache = require("../../cache")
const utils = require("../../utils")
const axios = require("axios")
const whitelist = require("../../utils/whitelists")
const ban = require("../../utils/banned")
const conf = require("../../config")

const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

module.exports = (fastify, opts, done) => {
    //get serverid for verify
    fastify.get("/id", async (req, res) => {

        let server_id = await utils.generateHexString(16);
        let username = req.query["username"];

        if (!username) {
            return res.code(400).send("Username is required")
        }

        if (conf.modHeader.enable && req.headers["user-agent"] != conf.modHeader.name) {
            console.log(username + " -> failed to connect (Header Not Match)")
            return res.code(403).send("The mod version is incorrect. Please install the latest version from the administrator (not official).")
        }

        const isBan = await ban.banCheck(username);
        if (isBan) {
            console.log(username + " -> failed to connect (banned)")
            return res.code(403).send("you got banned! contact support")
        }

        cache.serverIds[server_id] = username;
        return res.send(server_id);
    })

    //verify account
    fastify.get("/verify", async (req, res) => {
        let token = await utils.generateHexString(16);
        const serverId = req.query["id"];

        if (cache.serverIds[serverId]) {
            const authUsername = cache.serverIds[serverId];
            const requestUrl = `https://sessionserver.mojang.com/session/minecraft/hasJoined?username=${authUsername}&serverId=${serverId}`;

            try {
                const raw = await axios.get(requestUrl);
                const r = raw.data;

                if (raw.status !== 200) {
                    return res.code(500).send('Failed to retrieve data from the "Mojang" API');
                }

                //create db
                const validateWhitelist = await whitelist.check(authUsername);
                if (validateWhitelist) {
                    try {
                        await prisma.user.upsert({
                            where: {
                                uuid: utils.parseUUID(r.id),
                            },
                            create: {
                                username: authUsername,
                                uuid: utils.parseUUID(r.id),
                                equipped: [],
                                equippedBadges: {
                                    "special": Array(6).fill(0),
                                    "pride": Array(26).fill(0)
                                },
                                trust: 2
                            },
                            update: {
                                username: authUsername,
                                lastUsed: new Date()
                            }
                        })
                    } catch (error) {
                        console.log("UpdateData Error: ", error);
                    }
                }

                cache.players[token] = {
                    uuid: utils.parseUUID(r.id),
                    username: r.name,
                    ws: null
                };

                setTimeout(() => {
                    delete cache.serverIds[serverId] // clear cache serverId
                }, 20000);

                return res.send(token);
            } catch (error) {
                console.error(error);
                return res.code(500).send('Failed to send request or parse response');
            }
        } else {
            return res.code(404).send('Failed to authenticate');
        }
    })

    done()
}