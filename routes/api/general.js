const conf = require("../../config")

module.exports = (fastify, opts, done) => {
    //get current version
    fastify.get("/version", async (req, res) => {
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