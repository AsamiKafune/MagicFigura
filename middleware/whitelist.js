const whitelist = require("../utils/whitelists")
module.exports = async (req, res) => {
    const validate = await whitelist(req.user.data.username)
    if(!validate) {
        console.error(req.user.data.username + " ("+req.user.data.uuid+") tried to \""+req.raw.url+"\" without whitelist.")
        return res.code(403).send("whitelist is not allow.")
    }
}