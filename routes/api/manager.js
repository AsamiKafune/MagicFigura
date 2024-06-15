const cache = require("../../cache")
const ban = require("../../utils/banned")
const whitelist = require("../../utils/whitelists")

const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

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

    fastify.post("/ban", async (req, res) => {
        if (req.headers.key != process.env.THIS_IS_PASSWORD) return res.code(403).send("Do not have permission to do this.")
        const disconnectWS = req.query?.disconnect??false
        const username = req.query["username"]

        if(!username) return res.code(404).send("enter player name!")

        const isBan = await ban.banCheck(username)
        if (isBan) return "user has already in ban list!"

        const getBan = await ban.add(username)
        if (getBan) {
            if (disconnectWS) {
                const allplayer = Object.entries(cache.players).map(([key, value]) => {
                    return { key, ...value };
                });

                const player = allplayer.find(e => e.username == username)
                try {
                    player.ws.close();
                } catch (error) {
                    console.log("BanWS got error", error)
                }
            }
            return "user has been banned from system"
        }
        else return "please check console can't add user to ban list!"
    })

    fastify.post("/unban", async (req, res) => {
        if (req.headers.key != process.env.THIS_IS_PASSWORD) return res.code(403).send("Do not have permission to do this.")
        const username = req.query["username"]

        if(!username) return res.code(404).send("enter player name!")

        const isBan = await ban.banCheck(username)
        if (!isBan) return "username is not in banlist?"

        const removeBan = await ban.remove(username)
        if (removeBan) {
            return "remove successful!"
        }
        else return "please check console can't remove user from ban list!"
    })

    done()
}

