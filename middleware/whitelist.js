const whitelist = require("../utils/whitelists")
module.exports = async (req, res) => {
    const validate = await whitelist(req.user.data.username)
    if(!validate) return res.code(403).send("whitelist is not allow.")
}