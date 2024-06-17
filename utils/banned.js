const fs = require("fs");
const path = require("path");

let banList = {
    expired: 0,
    data: []
};

async function add(username) {
    let raw = fs.readFileSync(path.join(__dirname, "../banned.txt"))
    raw = raw.toString() + "\r\n" + username
    try {
        fs.writeFileSync(path.join(__dirname, "../banned.txt"), raw)
    } catch (error) {
        console.error("Ban (add) system error", error)
        return false
    }

    raw = {
        expired: Date.now() + (1000 * 30),
        data: raw.split("\r\n")
    }
    banList = raw;

    return true
}

async function remove(username) {
    let raw = fs.readFileSync(path.join(__dirname, "../banned.txt"))
    raw = raw.toString()
    raw = raw.split("\r\n")
    raw = raw.filter(e => e != username)
    raw = raw.join("\r\n")
    try {
        fs.writeFileSync(path.join(__dirname, "../banned.txt"), raw)
    } catch (error) {
        console.error("Ban (remove) system error", error)
        return false
    }

    raw = {
        expired: Date.now() + (1000 * 30),
        data: raw.split("\r\n")
    }
    banList = raw;

    return true
}

async function banCheck(username) {
    if (banList.expired > Date.now()) {
        const validate = banList.data.find(e => e == username);
        if (validate) return true
    } else {
        const newBanList = updateList();
        const validate = newBanList.data.find(e => e == username);
        if (validate) return true
    }
    return false
}

function updateList() {
    let raw = fs.readFileSync(path.join(__dirname, "../banned.txt"))
    raw = raw.toString().split("\r\n");
    raw = {
        expired: Date.now() + (1000 * 30),
        data: raw
    }
    banList = raw;
    return raw;
}

module.exports = {
    list: banList,
    banCheck,
    remove,
    add
}