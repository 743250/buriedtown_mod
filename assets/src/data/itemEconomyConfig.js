/**
 * NPC 经济系统 — 物品基础属性表
 *
 * 本文件定义所有参与 NPC 贸易经济循环的物品的基础属性。
 * 每个物品 ID 对应一个条目，包含：
 *   - category:           物品分类 (food/drink/medicine/tool/weapon/ammo/material/part/data)
 *   - defaultDailyConsume: 默认每日消耗量（0 表示 NPC 不覆盖则不消耗）
 *   - defaultDailyProduce: 默认每日生产量（0 表示 NPC 不覆盖则不生产）
 *   - defaultTargetStock:  默认目标库存量（0 表示 NPC 不覆盖则无上限）
 *
 * 设计原则：
 *   1. price 不在此表，price 仍由 npcConfig.favorite[tier].price 定义（NPC 专属）
 *   2. consumePool 不在此表，consumePool 是 NPC 级别的覆盖字段
 *   3. default 值全部填 0 — 具体日产/日消/目标库存由各 NPC 的 economyOverride 决定
 *   4. 所有参与 favorite / trading / needItem / gift / 经济循环的物品均收录
 *
 * 物品来源：docs/npc-trade-*.md（6 份 NPC 贸易设计文档）
 */

var itemEconomyConfig = {
    // ==================== 材料 (material) ====================
    "1101011": {
        category: "material",
        defaultDailyConsume: 0,
        defaultDailyProduce: 0,
        defaultTargetStock: 0
    },
    "1101021": {
        category: "material",
        defaultDailyConsume: 0,
        defaultDailyProduce: 0,
        defaultTargetStock: 0
    },
    "1101031": {
        category: "material",
        defaultDailyConsume: 0,
        defaultDailyProduce: 0,
        defaultTargetStock: 0
    },

    // ==================== 零件 (part) ====================
    "1101041": {
        category: "part",
        defaultDailyConsume: 0,
        defaultDailyProduce: 0,
        defaultTargetStock: 0
    },
    "1101051": {
        category: "part",
        defaultDailyConsume: 0,
        defaultDailyProduce: 0,
        defaultTargetStock: 0
    },

    // ==================== 数据 (data) ====================
    "1101073": {
        category: "data",
        defaultDailyConsume: 0,
        defaultDailyProduce: 0,
        defaultTargetStock: 0
    },

    // ==================== 枪械碎片 / 残片 (part) ====================
    "1102011": {
        category: "part",
        defaultDailyConsume: 0,
        defaultDailyProduce: 0,
        defaultTargetStock: 0
    },
    "1102022": {
        category: "part",
        defaultDailyConsume: 0,
        defaultDailyProduce: 0,
        defaultTargetStock: 0
    },
    "1102033": {
        category: "part",
        defaultDailyConsume: 0,
        defaultDailyProduce: 0,
        defaultTargetStock: 0
    },
    "1102042": {
        category: "part",
        defaultDailyConsume: 0,
        defaultDailyProduce: 0,
        defaultTargetStock: 0
    },
    "1102053": {
        category: "part",
        defaultDailyConsume: 0,
        defaultDailyProduce: 0,
        defaultTargetStock: 0
    },

    // ==================== 食物 (food) ====================
    "1103011": {
        category: "food",
        defaultDailyConsume: 0,
        defaultDailyProduce: 0,
        defaultTargetStock: 0
    },
    "1103022": {
        category: "food",
        defaultDailyConsume: 0,
        defaultDailyProduce: 0,
        defaultTargetStock: 0
    },
    "1103033": {
        category: "food",
        defaultDailyConsume: 0,
        defaultDailyProduce: 0,
        defaultTargetStock: 0
    },
    "1103041": {
        category: "food",
        defaultDailyConsume: 0,
        defaultDailyProduce: 0,
        defaultTargetStock: 0
    },
    "1103052": {
        category: "food",
        defaultDailyConsume: 0,
        defaultDailyProduce: 0,
        defaultTargetStock: 0
    },
    "1103063": {
        category: "food",
        defaultDailyConsume: 0,
        defaultDailyProduce: 0,
        defaultTargetStock: 0
    },
    "1103074": {
        category: "food",
        defaultDailyConsume: 0,
        defaultDailyProduce: 0,
        defaultTargetStock: 0
    },
    "1103083": {
        category: "food",
        defaultDailyConsume: 0,
        defaultDailyProduce: 0,
        defaultTargetStock: 0
    },

    // ==================== 药品 (medicine) ====================
    "1104011": {
        category: "medicine",
        defaultDailyConsume: 0,
        defaultDailyProduce: 0,
        defaultTargetStock: 0
    },
    "1104021": {
        category: "medicine",
        defaultDailyConsume: 0,
        defaultDailyProduce: 0,
        defaultTargetStock: 0
    },
    "1104032": {
        category: "medicine",
        defaultDailyConsume: 0,
        defaultDailyProduce: 0,
        defaultTargetStock: 0
    },
    "1104043": {
        category: "medicine",
        defaultDailyConsume: 0,
        defaultDailyProduce: 0,
        defaultTargetStock: 0
    },

    // ==================== 饮品 (drink) ====================
    "1105011": {
        category: "drink",
        defaultDailyConsume: 0,
        defaultDailyProduce: 0,
        defaultTargetStock: 0
    },
    "1105022": {
        category: "drink",
        defaultDailyConsume: 0,
        defaultDailyProduce: 0,
        defaultTargetStock: 0
    },
    "1105033": {
        category: "drink",
        defaultDailyConsume: 0,
        defaultDailyProduce: 0,
        defaultTargetStock: 0
    },

    // ==================== 奢侈消耗品 (material) ====================
    "1105061": {
        category: "material",
        defaultDailyConsume: 0,
        defaultDailyProduce: 0,
        defaultTargetStock: 0
    },
    "1105072": {
        category: "material",
        defaultDailyConsume: 0,
        defaultDailyProduce: 0,
        defaultTargetStock: 0
    },

    // ==================== 药品 / 血清 (medicine) ====================
    "1106054": {
        category: "medicine",
        defaultDailyConsume: 0,
        defaultDailyProduce: 0,
        defaultTargetStock: 0
    },
    "1107012": {
        category: "medicine",
        defaultDailyConsume: 0,
        defaultDailyProduce: 0,
        defaultTargetStock: 0
    },
    "1107022": {
        category: "medicine",
        defaultDailyConsume: 0,
        defaultDailyProduce: 0,
        defaultTargetStock: 0
    },
    "1107032": {
        category: "medicine",
        defaultDailyConsume: 0,
        defaultDailyProduce: 0,
        defaultTargetStock: 0
    },

    // ==================== 军用口粮 (food) ====================
    "1107042": {
        category: "food",
        defaultDailyConsume: 0,
        defaultDailyProduce: 0,
        defaultTargetStock: 0
    },

    // ==================== 成品枪械 (weapon) ====================
    "1301011": {
        category: "weapon",
        defaultDailyConsume: 0,
        defaultDailyProduce: 0,
        defaultTargetStock: 0
    },
    "1301022": {
        category: "weapon",
        defaultDailyConsume: 0,
        defaultDailyProduce: 0,
        defaultTargetStock: 0
    },
    "1301033": {
        category: "weapon",
        defaultDailyConsume: 0,
        defaultDailyProduce: 0,
        defaultTargetStock: 0
    },

    // ==================== 工具 (tool) ====================
    "1302011": {
        category: "tool",
        defaultDailyConsume: 0,
        defaultDailyProduce: 0,
        defaultTargetStock: 0
    },
    "1302021": {
        category: "tool",
        defaultDailyConsume: 0,
        defaultDailyProduce: 0,
        defaultTargetStock: 0
    },
    "1302043": {
        category: "tool",
        defaultDailyConsume: 0,
        defaultDailyProduce: 0,
        defaultTargetStock: 0
    },

    // ==================== 弹药 / 爆炸物 (ammo) ====================
    "1303012": {
        category: "ammo",
        defaultDailyConsume: 0,
        defaultDailyProduce: 0,
        defaultTargetStock: 0
    },
    "1303022": {
        category: "ammo",
        defaultDailyConsume: 0,
        defaultDailyProduce: 0,
        defaultTargetStock: 0
    },
    "1303044": {
        category: "ammo",
        defaultDailyConsume: 0,
        defaultDailyProduce: 0,
        defaultTargetStock: 0
    },
    "1305011": {
        category: "ammo",
        defaultDailyConsume: 0,
        defaultDailyProduce: 0,
        defaultTargetStock: 0
    }
};

// CommonJS 兼容（用于 node 工具链校验）
if (typeof module !== "undefined" && module.exports) {
    module.exports = itemEconomyConfig;
}
