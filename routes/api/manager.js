const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

const cache = require("../../cache")
const ban = require("../../utils/banned")
const whitelist = require("../../utils/whitelists")
const utils = require("../../utils")

module.exports = (fastify, opts, done) => {

    //server data
    fastify.get("/serverdata", async (req, res) => {
        
        whitelist.list = whitelist.updateWhitelist()
        ban.list = ban.updateList()

        return {
            info: {
                userCount: await prisma.user.count(),
                whitelists: whitelist.list.data.length,
                banned: ban.list.data.length,
            },
            network: {
                connected: cache.sessions.length,
                sessions: cache.localSessions.size
            }
        }
    })

    //ban
    fastify.post("/ban", async (req, res) => {
        if (req.headers.key != process.env.THIS_IS_PASSWORD) return res.code(403).send("Do not have permission to do this.")
        const disconnectWS = req.query?.disconnect ?? false
        const username = req.query["username"]

        if (!username) return res.code(404).send("enter player name!")

        const isBan = await ban.banCheck(username)
        if (isBan) return "user has already in ban list!"

        const getBan = await ban.add(username)
        if (getBan) {
            if (disconnectWS) {
                const session = cache.sessions.find(e => e.username == username)
                try {
                    await utils.sendToast(false, username, "banned", "Your figura account got banned from system!", 1)
                    setTimeout(() => {
                        session.ws.close(4001, "Your figura account got banned from system!");
                    }, 100);
                } catch (error) {
                    console.log("BanWS got error", error)
                }
            }
            const isWhitelist = await whitelist.check(username)
            if (isWhitelist) {
                await whitelist.remove(username).catch(() => { })
                await prisma.user.delete({
                    where: {
                        username: username
                    }
                }).catch(() => { })
            }

            return "user has been banned from system"
        }
        else return res.code(500).send("please check console can't add user to ban list!")
    })

    fastify.post("/unban", async (req, res) => {
        if (req.headers.key != process.env.THIS_IS_PASSWORD) return res.code(403).send("Do not have permission to do this.")
        const username = req.query["username"]

        if (!username) return res.code(404).send("enter player name!")

        const isBan = await ban.banCheck(username)
        if (!isBan) return res.code(404).send("username is not in banlist?")

        const removeBan = await ban.remove(username)
        if (removeBan) {
            return "remove successful!"
        }
        else return res.code(500).send("please check console can't remove user from ban list!")
    })

    //whitelist
    fastify.post("/whitelist/add", async (req, res) => {
        if (req.headers.key != process.env.THIS_IS_PASSWORD) return res.code(403).send("Do not have permission to do this.")
        const username = req.query["username"]

        if (!username) return res.code(404).send("enter player name!")

        const check = await whitelist.check(username)
        if (check) return "user has already in whitelist!"

        const userAdd = await whitelist.add(username)
        if (userAdd) {
            return "user has been added whitelist"
        }
        else return res.code(500).send("please check console can't add user to whitelist!")
    })

    fastify.post("/whitelist/remove", async (req, res) => {
        if (req.headers.key != process.env.THIS_IS_PASSWORD) return res.code(403).send("Do not have permission to do this.")
        const username = req.query["username"]

        if (!username) return res.code(404).send("enter player name!")

        const check = await whitelist.check(username)
        if (!check) return res.code(404).send("username is not in whitelist?")

        const userremove = await whitelist.remove(username)
        if (userremove) {
            return "remove successful!"
        }
        else return res.code(500).send("please check console can't remove user from whitelist!")
    })

    //utils
    fastify.post("/alert", async (req, res) => {
        if (req.headers.key != process.env.THIS_IS_PASSWORD) return res.code(403).send("Do not have permission to do this.")
        const username = req.query["username"]
        const { title, message, type = 0, boardcast } = req.body

        if (boardcast && !username) return res.code(404).send("enter player name!")
        const send = await utils.sendToast(boardcast, username, title, message, type)
        if (!send) return res.code(500).send("Error check console!")
        return "ok"
    })

    fastify.post("/chat", async (req, res) => {
        if (req.headers.key != process.env.THIS_IS_PASSWORD) return res.code(403).send("Do not have permission to do this.")
        const username = req.query["username"]
        const { message, boardcast } = req.body

        if (boardcast && !username) return res.code(404).send("enter player name!")
        const send = await utils.sendChat(boardcast, username, message)
        if (!send) return res.code(500).send("Error check console!")
        return "ok"
    })

    fastify.post("/notice", async (req, res) => {
        if (req.headers.key != process.env.THIS_IS_PASSWORD) return res.code(403).send("Do not have permission to do this.")
        const username = req.query["username"]
        const { type = 0, boardcast } = req.body

        if (boardcast && !username) return res.code(404).send("enter player name!")
        const send = await utils.sendNotice(boardcast, username, type)
        if (!send) return res.code(500).send("Error check console!")
        return "ok"
    })

    done()
}

