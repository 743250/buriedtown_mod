/**
 * 内容配置蓝图
 * 用途：定义角色/天赋/物品的配置规范（单一数据源）
 *
 * 所有验证工具和生成工具都基于此蓝图工作
 *
 * 创建时间：2026-03-06
 */

var ContentBlueprint = {
    /**
     * 角色配置蓝图
     */
    role: {
        fields: [
            {
                name: "role.js 映射",
                file: "game/role.js",
                location: "_roleConfigMap[{id}]",
                required: true,
                template: "{id}: { exchangeId: 100X, purchaseId: 11X, avatarFallback: 'npc_dig_X.png' }",
                validator: function(id) {
                    return typeof role !== "undefined" &&
                           role._roleConfigMap &&
                           !!role._roleConfigMap[id];
                }
            },
            {
                name: "图标映射",
                file: "util/iconHelper.js",
                location: "_roleIconMap[{id}]",
                required: true,
                template: "{id}: 'npc_dig_X.png'",
                validator: function(id) {
                    return typeof IconHelper !== "undefined" &&
                           IconHelper._roleIconMap &&
                           !!IconHelper._roleIconMap[id];
                }
            },
            {
                name: "头像映射",
                file: "util/iconHelper.js",
                location: "_roleAvatarMap[{id}]",
                required: false,
                template: "{id}: 'npc_dig_X.png'",
                validator: function(id) {
                    return typeof IconHelper !== "undefined" &&
                           IconHelper._roleAvatarMap &&
                           !!IconHelper._roleAvatarMap[id];
                }
            },
            {
                name: "角色文案",
                file: "data/string/string_zh.js",
                location: "npc_{id}",
                required: true,
                template: "\"npc_{id}\": { name: '角色名', des: '描述', dialogs: [...] }",
                validator: function(id) {
                    return typeof stringUtil !== "undefined" &&
                           !!stringUtil.getString("npc_" + id);
                }
            }
        ]
    },

    /**
     * 天赋配置蓝图
     */
    talent: {
        fields: [
            {
                name: "天赋列表",
                file: "game/IAPPackage.js",
                location: "packageList",
                required: true,
                template: "{ id: {id}, ... }",
                validator: function(id) {
                    if (typeof IAPPackage === "undefined" || !IAPPackage.packageList) {
                        return false;
                    }
                    for (var i = 0; i < IAPPackage.packageList.length; i++) {
                        if (IAPPackage.packageList[i].id === id) {
                            return true;
                        }
                    }
                    return false;
                }
            },
            {
                name: "天赋文案",
                file: "data/string/string_zh.js",
                location: "p_{id}",
                required: true,
                template: "\"p_{id}\": { name: '天赋名', des: '描述', effect: '效果' }",
                validator: function(id) {
                    return typeof stringUtil !== "undefined" &&
                           !!stringUtil.getString("p_" + id);
                }
            }
        ]
    },

    /**
     * 物品配置蓝图
     */
    item: {
        fields: [
            {
                name: "物品配置",
                file: "data/itemConfig.js",
                location: "itemConfig[{id}]",
                required: true,
                template: "{id}: { type: X, ... }",
                validator: function(id) {
                    return typeof itemConfig !== "undefined" &&
                           !!itemConfig[id];
                }
            },
            {
                name: "物品文案",
                file: "data/string/string_zh.js",
                location: "{id}",
                required: true,
                template: "\"{id}\": { title: '物品名', des: '描述' }",
                validator: function(id) {
                    return typeof stringUtil !== "undefined" &&
                           !!stringUtil.getString(id);
                }
            }
        ]
    },

    /**
     * 获取蓝图
     * @param {string} type - 类型 (role/talent/item)
     * @returns {object} 蓝图
     */
    getBlueprint: function(type) {
        return this[type];
    }
};
