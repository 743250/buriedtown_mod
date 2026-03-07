/**
 * 游戏常量定义
 * 集中管理所有魔法数字和配置常量
 */

// 玩家属性初始值
var PlayerAttr = {
    HP_INIT: 240,
    HP_MAX: 240,
    SPIRIT_INIT: 100,
    SPIRIT_MAX: 100,
    STARVE_INIT: 50,
    STARVE_MAX: 100,
    VIGOUR_INIT: 100,
    VIGOUR_MAX: 100,
    INJURY_INIT: 0,
    INJURY_MAX: 100,
    INFECT_INIT: 0,
    INFECT_MAX: 100,
    TEMPERATURE_MAX: 100
};

// 战斗配置
var BattleConst = {
    LINE_LENGTH: 6,
    MAX_REAL_DISTANCE: 1000,
    REAL_DISTANCE_PER_LINE: 100,
    ESCAPE_TIME: 1.5,
    BULLET_ID: 1305011
};

// 装备位置
var EquipmentPos = {
    GUN: 0,
    WEAPON: 1,
    EQUIP: 2,
    TOOL: 3
};

// 事件名称
var GameEvents = {
    BUILD_NODE_UPDATE: 'build_node_update',
    PLAYER_ATTR_CHANGE: 'player_attr_change',
    INVENTORY_CHANGE: 'inventory_change',
    BATTLE_END: 'battle_end'
};

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        PlayerAttr: PlayerAttr,
        BattleConst: BattleConst,
        EquipmentPos: EquipmentPos,
        GameEvents: GameEvents
    };
}
