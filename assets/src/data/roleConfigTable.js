/**
 * 角色配置表 - 统一管理所有角色的配置信息
 * 替代role.js中分散的硬编码映射
 */

var RoleConfigTable = {
    // 老罗
    1: {
        roleType: 1,
        exchangeId: 1001,
        purchaseId: 108,
        nameStringId: 1313,
        selectionDescriptionStringId: 1314,
        infoDescriptionSource: {type: "purchase", purchaseId: 108, field: "des"},
        infoEffectSource: {type: "purchase", purchaseId: 108, field: "effect"},
        avatarFallback: "npc_dig_1.png",
        selectionOrder: 1,
        npcId: 1,
        actionTags: ["luo"],
        visitorNpcIds: [6, 4, 2, 3],
        visitorUnlockedNpcIds: [5],
        specialBuilds: [16, 17, 5],
        roomBuilds: [
            {id: 16, level: -1},
            {id: 17, level: 0},
            {id: 5, level: -1}
        ],
        temperatureBuild: {id: 5},
        restActionTypes: ["drink"],
        buildLevelCaps: {
            6: 0
        },
        unlockSites: [20, 21],
        battleModifiers: {
            precisePenalty: true,
            homeDefenseMode: "dog_only"
        }
    },

    // 金医生
    2: {
        roleType: 2,
        exchangeId: 1003,
        purchaseId: 110,
        nameStringId: 1319,
        selectionDescriptionStringId: 1315,
        infoDescriptionStringId: 1324,
        infoEffectStringId: 1325,
        avatarFallback: "npc_dig_2.png",
        selectionOrder: 3,
        npcId: 2,
        actionTags: ["jin"],
        visitorNpcIds: [1, 4, 3, 6],
        visitorUnlockedNpcIds: [5],
        unlockSites: [51, 52],
        restActionTypes: ["drink_tea"],
        attrModifiers: {
            hungerDecay: 0.75
        }
    },

    // 杰夫
    3: {
        roleType: 3,
        exchangeId: 1005,
        purchaseId: 112,
        nameStringId: 1331,
        selectionDescriptionStringId: 1332,
        infoDescriptionStringId: 1333,
        infoEffectStringId: 1334,
        avatarFallback: "npc_dig_3.png",
        selectionOrder: 5,
        npcId: 3,
        actionTags: ["jie"],
        visitorNpcIds: [1, 4, 2, 6],
        visitorUnlockedNpcIds: [5],
        unlockSites: [30, 32]
    },

    // 雅子
    4: {
        roleType: 4,
        exchangeId: 1002,
        purchaseId: 109,
        nameStringId: 1321,
        selectionDescriptionStringId: 1322,
        infoDescriptionSource: {type: "purchase", purchaseId: 109, field: "des"},
        infoEffectSource: {type: "purchase", purchaseId: 109, field: "effect"},
        avatarFallback: "npc_dig_4.png",
        selectionOrder: 2,
        npcId: 4,
        actionTags: ["yazi", "powered"],
        visitorNpcIds: [1, 6, 2, 3],
        visitorUnlockedNpcIds: [5],
        specialBuilds: [7, 19, 18],
        roomBuilds: [
            {id: 7, level: -1},
            {id: 19, level: -1},
            {id: 18, level: -1}
        ],
        temperatureBuild: {
            id: 18,
            levels: [0]
        },
        unlockSites: [204, 43, 41],
        battleModifiers: {
            homeDefenseMode: "dog_only"
        }
    },

    // 比尔
    5: {
        roleType: 5,
        exchangeId: 1004,
        purchaseId: 111,
        nameStringId: 1327,
        selectionDescriptionStringId: 1328,
        infoDescriptionStringId: 1329,
        infoEffectStringId: 1330,
        avatarFallback: "npc_dig_5.png",
        selectionOrder: 4,
        npcId: 5,
        actionTags: ["bier"],
        visitorNpcIds: [1, 4, 3, 2, 6],
        visitorUnlockedNpcIds: [5],
        siteNpcUnlocksEnabled: false,
        unlockSites: [61, 14, 301],
        specialItems: [1305044]
    },

    // 陌生人
    6: {
        roleType: 6,
        exchangeId: null,
        purchaseId: null,
        nameStringId: 1311,
        selectionDescriptionStringId: 1312,
        infoDescriptionStringId: 1317,
        infoEffectStringId: 1318,
        avatarFallback: "npc_dig_6.png",
        selectionOrder: 0,
        npcId: 6,
        actionTags: ["stranger"],
        visitorNpcIds: [1, 4, 2, 3],
        visitorUnlockedNpcIds: [5],
        specialBuilds: [7, 8, 5, 9],
        unlockSites: [203]
    },

    // 测试人物(KING)
    7: {
        roleType: 7,
        exchangeId: 1006,
        purchaseId: 113,
        nameStringId: 1342,
        selectionDescriptionStringId: 1343,
        infoDescriptionStringId: 1343,
        infoEffectStringId: 1344,
        avatarFallback: "npc_dig_6.png",
        selectionOrder: 7,
        npcId: 7,
        actionTags: ["king", "powered"],
        visitorNpcIds: [1, 4, 2, 6, 3],
        visitorUnlockedNpcIds: [5],
        specialBuilds: [7, 19, 18],
        roomBuilds: [
            {id: 7, level: -1},
            {id: 19, level: -1},
            {id: 18, level: -1}
        ],
        temperatureBuild: {
            id: 18,
            levels: [0]
        },
        siteNpcUnlocksEnabled: false,
        unlockSites: [61, 204, 301],
        unlockNpcs: [1, 2, 3, 4, 6],
        battleModifiers: {
            homeDefenseMode: "dog_only"
        }
    },

    // 贝尔
    8: {
        roleType: 8,
        exchangeId: 1007,
        purchaseId: 114,
        nameStringId: 1345,
        selectionDescriptionStringId: 1346,
        infoDescriptionSource: {type: "purchase", purchaseId: 114, field: "des"},
        infoEffectSource: {type: "purchase", purchaseId: 114, field: "effect"},
        avatarFallback: "npc_dig_7.png",
        mapRoleType: 7,
        selectionOrder: 6,
        npcId: 8,
        actionTags: ["bell"],
        visitorNpcIds: [1, 4, 2, 3],
        visitorUnlockedNpcIds: [5],
        zipline: {
            enabled: true,
            timeRatio: 0.3,
            homeOnly: true,
            buildFromSiteOnly: true,
            buildCost: [
                {itemId: 1101011, num: 8},
                {itemId: 1101021, num: 4},
                {itemId: 1101031, num: 4}
            ]
        }
    }
};
