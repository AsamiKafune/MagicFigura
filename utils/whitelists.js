const fs = require("fs");
const path = require("path");

let whitelist = {
    expired: 0,
    data: []
};

async function add(username) {
    let raw = fs.readFileSync(path.join(__dirname, "../whitelist.txt"))
    raw = raw.toString() + "\r\n" + username 
    try {
        fs.writeFileSync(path.join(__dirname, "../whitelist.txt"), raw)
    } catch (error) {
        console.error("Whitelist (add) system error", error)
        return false
    }

    raw = {
        expired: Date.now() + (1000 * 30),
        data: raw.split("\r\n")
    }
    whitelist = raw;

    return true
}

async function remove(username) {
    let raw = fs.readFileSync(path.join(__dirname, "../whitelist.txt"))
    raw = raw.toString()
    raw = raw.split("\r\n")
    raw = raw.filter(e => e != username)
    raw = raw.join("\r\n")
    try {
        fs.writeFileSync(path.join(__dirname, "../whitelist.txt"), raw)
    } catch (error) {
        console.error("Whitelist (remove) system error", error)
        return false
    }

    raw = {
        expired: Date.now() + (1000 * 30),
        data: raw.split("\r\n")
    }
    whitelist = raw;

    return true
}

async function check(username) {
    return true; //whitelist unlock
    if (whitelist.expired > Date.now()) {
        const validate = whitelist.data.find(e => e == username);
        if (validate) return true
    } else {
        const newWhitelist = updateWhitelist();
        const validate = newWhitelist.data.find(e => e == username);
        if (validate) return true
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

module.exports = {
    list: whitelist,
    add,
    remove,
    check
}