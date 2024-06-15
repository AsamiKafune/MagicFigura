const fs = require("fs");
const path = require("path");

let whitelist = {
    expired: 0,
    data: []
};

module.exports = async (username) => {
    if (whitelist.expired > Date.now()) {
        const validate = whitelist.data.find(e => e == username);
        if(validate) return true
    } else {
        const newWhitelist = updateWhitelist();
        const validate = newWhitelist.data.find(e => e == username);
        if(validate) return true
    }
    return false
}

function updateWhitelist() {
    let raw = fs.readFileSync(path.join(__dirname, "../whitelist.txt"))
    raw = raw.toString().split("\r\n");
    raw = {
        expired: Date.now() + (1000 * 60) * 5,
        data: raw
    }
    whitelist = raw;
    return raw;
}