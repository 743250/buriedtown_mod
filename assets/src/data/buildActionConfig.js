/**
 * Created by lancelot on 15/4/24.
 */
var buildActionConfig = {
    "5": [{
        "cost": [{"itemId": 1101011, "num": 1}],
        "makeTime": 240,
        "max": 6
    }],
    "8": [{
        "produce": [{"itemId": 1103041, "num": 4}],
        "cost": [{"itemId": 1103011, "num": 2}],
        "makeTime": 30,
        "placedTime": [2880, 4320]
    }],
    "9": [{
        "rate": 0.7
    }, {
        "rate": 1
    }],
    "10": [
        [{
            "cost": [{"itemId": 1105011, "num": 4}, {
                "itemId": 1101061,
                "num": 1
            }, {"itemId": 1101011, "num": 1}],
            "makeTime": 60,
            "effect": {"spirit": 60, "spirit_chance": 1}
        }, {
            "cost": [{"itemId": 1105022, "num": 3}],
            "makeTime": 60,
            "effect": {"spirit": 60, "spirit_chance": 1}
        }, {
            "cost": [{"itemId": 1105051, "num": 4}, {
                "itemId": 1101061,
                "num": 1
            }, {"itemId": 1101011, "num": 1}],
            "makeTime": 10,
            "effect": {"hp":100, "hp_chance": 1}
        }, {
            "cost": [{"itemId": 1105061, "num": 1}],
            "makeTime": 10,
            "effect": {"spirit": 12, "spirit_chance": 1}
        }, {
            "cost": [{"itemId": 1105072, "num": 1}],
            "makeTime": 15,
            "effect": {"spirit": 24, "spirit_chance": 1, "vigour": 4, "vigour_chance": 1}
        }, {
            "cost": [{"itemId": 1105083, "num": 1}],
            "makeTime": 20,
            "effect": {"spirit": 38, "spirit_chance": 1, "vigour": 8, "vigour_chance": 1}
        }],
        [{
            "cost": [{"itemId": 1105011, "num": 4}, {
                "itemId": 1101061,
                "num": 1
            }, {"itemId": 1101011, "num": 1}],
            "makeTime": 60,
            "effect": {"spirit": 80, "spirit_chance": 1}
        }, {
            "cost": [{"itemId": 1105022, "num": 3}],
            "makeTime": 60,
            "effect": {"spirit": 80, "spirit_chance": 1}
        }, {
            "cost": [{"itemId": 1105051, "num": 3}, {
                "itemId": 1101061,
                "num": 1
            }, {"itemId": 1101011, "num": 1}],
            "makeTime": 10,
            "effect": {"hp":100, "hp_chance": 1}
        }, {
            "cost": [{"itemId": 1105061, "num": 1}],
            "makeTime": 10,
            "effect": {"spirit": 16, "spirit_chance": 1}
        }, {
            "cost": [{"itemId": 1105072, "num": 1}],
            "makeTime": 15,
            "effect": {"spirit": 30, "spirit_chance": 1, "vigour": 6, "vigour_chance": 1}
        }, {
            "cost": [{"itemId": 1105083, "num": 1}],
            "makeTime": 20,
            "effect": {"spirit": 46, "spirit_chance": 1, "vigour": 10, "vigour_chance": 1}
        }],
        [{
            "cost": [{"itemId": 1105011, "num": 4}, {
                "itemId": 1101061,
                "num": 1
            }, {"itemId": 1101011, "num": 1}],
            "makeTime": 60,
            "effect": {"spirit": 100, "spirit_chance": 1}
        }, {
            "cost": [{"itemId": 1105022, "num": 3}],
            "makeTime": 60,
            "effect": {"spirit": 100, "spirit_chance": 1}
        }, {
            "cost": [{"itemId": 1105051, "num": 2}, {
                "itemId": 1101061,
                "num": 1
            }, {"itemId": 1101011, "num": 1}],
            "makeTime": 10,
            "effect": {"hp": 100, "hp_chance": 1}
        }, {
            "cost": [{"itemId": 1105061, "num": 1}],
            "makeTime": 10,
            "effect": {"spirit": 20, "spirit_chance": 1}
        }, {
            "cost": [{"itemId": 1105072, "num": 1}],
            "makeTime": 15,
            "effect": {"spirit": 36, "spirit_chance": 1, "vigour": 8, "vigour_chance": 1}
        }, {
            "cost": [{"itemId": 1105083, "num": 1}],
            "makeTime": 20,
            "effect": {"spirit": 54, "spirit_chance": 1, "vigour": 12, "vigour_chance": 1}
        }]
    ],
    "12": [{
        "cost": [{"itemId": 1103041, "num": 2}],
        "makeTime": 30
    }],
    "17": [{
        "cost": [{"itemId": 1303012, "num": 3}],
        "makeTime": 30
    }]
};
module.exports = buildActionConfig;
