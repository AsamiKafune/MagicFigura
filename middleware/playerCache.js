const cache = require("../cache")

module.exports = async (req,res) => {
    const token = req.headers["token"];
    const playerData = cache.players.get(token);
    
    if(!playerData) return res.code(401).send("unauthorized");

    req.user = {
        token: token,
        data: playerData
    }
}