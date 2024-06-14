module.exports = {
    port: 3000,
    host: "0.0.0.0",
    welcomeMessage: "Hello from MagicFigura V2 (0.1b)",
    version: {
        "release": "0.1.4",
        "prerelease": "0.1.4"
    },
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
            "maxAvatars": 10,
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
            "text": "Visit "
        },
        {
            "clickEvent": {
                "action": "open_url",
                "value": "https://kfn.moe"
            },
            "color": "gold",
            "underlined": true,
            "text": "developer"
        },
        {
            "clickEvent": {
                "action": "open_url",
                "value": "https://kfn.moe"
            },
            "text": " website!\n\n"
        },
        {
            "color": "red",
            "text": "This is for roleplay server\n"
        },
        {
            "color": "green",
            "text": "if you want to selfhost figura\n contact me https://kfn.moe"
        }
    ]
}