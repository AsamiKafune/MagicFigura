const whitelist = require("../utils/whitelists")
const { sendToast } = require("../utils")
const conf = require("../config")
module.exports = async (req, res) => {
    if (conf.whitelist) {
        const validate = await whitelist.check(req.user.data.username)
        if (!validate) {
            console.error(req.user.data.username + " (" + req.user.data.uuid + ") tried to \"" + req.raw.url + "\" without whitelist.")
            try {
                await sendToast(false, req.user.data.username, "No permission.", "whitelist is not allowed.", 2)
            } catch (error) {
                // do nothing
            }

            return res.code(403).send("whitelist is not allowed.")
        }
    }
}