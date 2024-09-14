const conf = require("../../config")
const utils = require("../../utils")
const cache = require("../../cache")



module.exports = (fastify, opts, done) => {
    //get current version
    fastify.get("/version", async (req, res) => {
        let token = req.headers["token"]
        if (!token) return conf.version

        if (conf.modHeader.enable && req.headers["user-agent"] != conf.modHeader.name) {
            const username = cache.players[token]["username"]
            const session = cache.sessions.find(e => e.username == username)
            try {
                await utils.sendToast(false, username, "The mod version is incorrect.", "Please install the latest version. ("+conf.version.release+")", 0)
                setTimeout(() => {
                    delete cache.players[token]
                    session.ws.close(4001, "The mod version is incorrect. Please install the latest version from the administrator (not official).");
                    cache.sessions = cache.sessions.filter(e => e.username != username)
                }, 100);
            } catch (error) {
                console.log("disconnect error: ", error)
            }
        }

        return conf.version
    })

    //get motd
    fastify.get("/motd", async (req, res) => {
        return conf.motd
    })

    //get limit upload
    fastify.get("/limits", async (req, res) => {
        return conf.limit
    })

    done()
}