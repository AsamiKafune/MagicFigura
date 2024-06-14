const cache = require("../../cache")

module.exports = (fastify, opts, done) => {

    fastify.get("/serverdata", async (req, res) => {
        if (req.headers.magicadmin != "do not ddos me!") return {}
        let _sessions = cache.sessions.map(e => {
            return {
                owner: e.owner,
                member: e.member.map(_ => _.uuid)
            };
        });
        return {
            sessions: _sessions,
            server: cache.serverIds,
            players: cache.players
        }
    })

    done()
}