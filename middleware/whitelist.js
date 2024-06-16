const whitelist = require("../utils/whitelists")
const cache = require("../cache")
const { sendToast } = require("../utils")
module.exports = async (req, res) => {
    const validate = await whitelist.check(req.user.data.username)
    if (!validate) {
        console.error(req.user.data.username + " (" + req.user.data.uuid + ") tried to \"" + req.raw.url + "\" without whitelist.")
        try {
            await sendToast(false, req.user.data.username, "No permission.", "whitelist is not allow.", 2)
        } catch (error) {
            // do nothing
        }

        return res.code(403).send("whitelist is not allow.")
    }
}