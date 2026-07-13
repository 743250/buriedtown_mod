"use strict";

/**
 * NPC 经济设计表（docs/npc-economy-plan.md §16）真相源副本。
 * smoke 用此表断言真实 npcConfig.economyOverride 与一日 tick 行为。
 * 仅含参与经济的 NPC 1–6；7/8 不参与。
 */
const NPC_ECONOMY_DESIGN_TABLE = {
    1: {
        name: "老罗",
        produce: {
            1305011: 8,
            1303022: 1,
            1102011: 2,
            1303012: 1,
            1102022: 2,
            1102033: 3
        },
        // 仅 favorite 列表内会进入 _getConsumeMap；子弹自产自销跳过
        consume: {
            1105022: 0.5,
            1105033: 0.5
        }
    },
    2: {
        name: "金医生",
        produce: {
            1104021: 1,
            1104011: 1,
            1104043: 1
        },
        consumePool: {
            id: "jin_food",
            dailyConsume: 2,
            members: [
                1103011, 1103022, 1103033, 1103041,
                1103052, 1103063, 1103074, 1103083
            ]
        }
    },
    3: {
        name: "杰夫",
        produce: {
            1101011: 10,
            1101031: 5
        },
        consumePool: {
            id: "jie_tool",
            dailyConsume: 1,
            members: [1302011, 1302021, 1302043]
        }
    },
    4: {
        name: "雅子",
        produce: {
            1101021: 6,
            1101041: 6,
            1101051: 3,
            1302043: 1
        },
        consume: {
            1105011: 4
        }
    },
    5: {
        name: "比尔",
        produce: {
            1107012: 1,
            1107022: 1,
            1107032: 1,
            1107042: 1,
            1303044: 1
        },
        consume: {
            1101073: 1
        }
    },
    6: {
        name: "陌生人",
        produce: {
            1105022: 1,
            1101071: 1,
            1103074: 1,
            1105011: 4
        },
        consume: {
            1305011: 10
        }
    }
};

module.exports = {
    NPC_ECONOMY_DESIGN_TABLE: NPC_ECONOMY_DESIGN_TABLE
};
