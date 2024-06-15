const cache = require("../../cache")

module.exports = (fastify, opts, done) => {

    fastify.get("/serverdata", async (req, res) => {
        if (req.headers.key != process.env.THIS_IS_PASSWORD) return res.code(403).send("Do not have permission to do this.")
        let ss = cache.sessions.map(e => {
            return {
                owner: e.owner,
                member: e.member.map(_ => _.uuid)
            };
        });
        return {
            sessions: ss,
            tempSid: cache.serverIds,
            players: cache.players,
            wsAlive: cache.wsData.size
        }
    })

    done()
}