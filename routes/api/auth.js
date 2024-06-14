const cache = require("../../cache")
const utils = require("../../utils")
const axios = require("axios")

module.exports = (fastify, opts, done) => {
    //get serverid for verify
    fastify.get("/id", async (req, res) => {
        let server_id = await utils.generateHexString(16);
        let username = req.query["username"];
        if (!username) {
            return res.code(400).send("Username is required")
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

                cache.players[token] = {
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

    done()
}