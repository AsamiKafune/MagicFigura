module.exports = {
    nodeName: "asia, Thailand bangkok",
    version: {
        "release": require("./package.json").version,
        "prerelease": require("./package.json").version
    },
    modHeader: {
        name: "Figura/"+require("./package.json").version+"+1.20.1",
        enable: false
    },
    multiInstant: true,
    whitelist: false,
    port: 3000,
    host: "0.0.0.0",
    welcomeMessage: "Hello from MagicFigura Emulator V2",
    limit: {
        "rate": {
            "pingSize": 1024,
            "pingRate": 32,
            "equip": 1,
            "download": 50,
            "upload": 1
        },
        "limits": {
            "maxAvatarSize": 100000,
            "maxAvatars": 5,
            "allowedBadges": {
                "special": Array(6).fill(0),
                "pride": Array(26).fill(0)
            }
        }
    },
    motd: [
        {
            "clickEvent": {
                "action": "open_url",
                "value": "https://kfn.moe"
            },
            "text": "MagicFigura by "
        },
        {
            "clickEvent": {
                "action": "open_url",
                "value": "https://kfn.moe"
            },
            "color": "gold",
            "underlined": true,
            "text": "KafuneCH"
        },
        {
            "color": "white",
            "text": "\n\nสนับสนุนพวกเราด้วยการโดเนท\nเพื่อให้โปรเจ็คนี้อยู่ต่อไปได้นาน ๆ\n\n["
        },
        {
            "clickEvent": {
                "action": "open_url",
                "value": "https://donate.kfn.moe/d/kafunech"
            },
            "color": "green",
            "underlined": true,
            "text": "คลิ๊กที่นี่"
        },
        {
            "color": "white",
            "text": "] เพื่อโดเนทขอบคุณครับ (✿◡‿◡)"
        },
        {
            "color": "white",
            "text": "\n\n◆ Social Media ◆\n"
        },
        {
            "clickEvent": {
                "action": "open_url",
                "value": "https://github.com/asamikafune"
            },
            "color": "blue",
            "text": "Github: asamikafune\n"
        },
        {
            "clickEvent": {
                "action": "open_url",
                "value": "https://www.youtube.com/@kafunech?sub_confirmation=1"
            },
            "color": "red",
            "text": "Youtube: @kafunech\n"
        },
        {
            "clickEvent": {
                "action": "open_url",
                "value": "https://kfn.moe"
            },
            "color": "yellow",
            "text": "Website: kfn.moe"
        }
    ]
}