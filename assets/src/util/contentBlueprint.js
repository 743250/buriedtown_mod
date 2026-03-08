/**
 * ContentBlueprint describes the real content sources used by the current
 * role / talent / item pipelines so validators can catch missing links early.
 */
var ContentBlueprint = {
    _normalizeId: function (id) {
        var normalizedId = parseInt(id);
        return isNaN(normalizedId) ? null : normalizedId;
    },
    _getRoleConfig: function (id) {
        id = this._normalizeId(id);
        if (id === null || typeof RoleConfigTable === "undefined" || !RoleConfigTable) {
            return null;
        }
        return RoleConfigTable[id] || null;
    },
    _getTalentConfig: function (id) {
        id = this._normalizeId(id);
        if (id === null || typeof TalentConfigTable === "undefined" || !TalentConfigTable) {
            return null;
        }
        return TalentConfigTable[id] || null;
    },
    _getStringValue: function (stringId) {
        if (stringId === undefined
            || stringId === null
            || typeof stringUtil === "undefined"
            || !stringUtil
            || typeof stringUtil.getString !== "function") {
            return null;
        }
        return stringUtil.getString(stringId);
    },
    _hasStringText: function (stringId, fieldName) {
        var strValue = this._getStringValue(stringId);
        if (!strValue) {
            return false;
        }
        if (fieldName === undefined || fieldName === null) {
            return typeof strValue === "string" && strValue.length > 0;
        }
        return typeof strValue === "object"
            && typeof strValue[fieldName] === "string"
            && strValue[fieldName].length > 0;
    },
    _hasPurchaseConfig: function (purchaseId) {
        purchaseId = this._normalizeId(purchaseId);
        if (purchaseId === null || typeof PurchaseList === "undefined" || !PurchaseList) {
            return false;
        }
        return !!PurchaseList[purchaseId];
    },
    _findExchangeConfig: function (type, targetId, level) {
        targetId = this._normalizeId(targetId);
        if (targetId === null
            || typeof ExchangeAchievementConfig === "undefined"
            || !ExchangeAchievementConfig) {
            return null;
        }

        for (var exchangeId in ExchangeAchievementConfig) {
            var exchangeConfig = ExchangeAchievementConfig[exchangeId];
            if (!exchangeConfig || exchangeConfig.type !== type) {
                continue;
            }
            if (parseInt(exchangeConfig.targetId) !== targetId) {
                continue;
            }
            if (level !== undefined && level !== null) {
                if (parseInt(exchangeConfig.level || 1) !== parseInt(level)) {
                    continue;
                }
            }
            return exchangeConfig;
        }
        return null;
    },
    _hasValidRoleTypeList: function (list) {
        if (!Array.isArray(list)) {
            return false;
        }
        for (var i = 0; i < list.length; i++) {
            if (!ContentBlueprint._getRoleConfig(list[i])) {
                return false;
            }
        }
        return true;
    },
    _hasValidStringList: function (list) {
        if (!Array.isArray(list)) {
            return false;
        }
        for (var i = 0; i < list.length; i++) {
            if (typeof list[i] !== "string" || !list[i]) {
                return false;
            }
        }
        return true;
    },
    _hasValidSpecialItems: function (list) {
        if (!Array.isArray(list)) {
            return false;
        }
        for (var i = 0; i < list.length; i++) {
            var item = list[i];
            var itemId = typeof item === "number" ? item : (item && (item.itemId || item.id));
            itemId = ContentBlueprint._normalizeId(itemId);
            if (itemId === null
                || typeof itemConfig === "undefined"
                || !itemConfig
                || !itemConfig[itemId]) {
                return false;
            }
        }
        return true;
    },
    _hasValidZiplineConfig: function (config) {
        if (!config || typeof config !== "object") {
            return false;
        }
        if (typeof config.enabled !== "boolean") {
            return false;
        }
        if (config.timeRatio === undefined) {
            return true;
        }
        return typeof config.timeRatio === "number" && config.timeRatio > 0;
    },
    role: {
        fields: [
            {
                name: "角色配置",
                file: "data/roleConfigTable.js",
                required: true,
                validator: function (id) {
                    return !!ContentBlueprint._getRoleConfig(id);
                }
            },
            {
                name: "角色兑换配置",
                file: "game/medal.js",
                required: true,
                validator: function (id) {
                    var roleConfig = ContentBlueprint._getRoleConfig(id);
                    if (!roleConfig) {
                        return false;
                    }
                    if (!roleConfig.exchangeId) {
                        return true;
                    }
                    var exchangeConfig = ContentBlueprint._findExchangeConfig("character", id);
                    return !!exchangeConfig && parseInt(exchangeConfig.targetId) === parseInt(id);
                }
            },
            {
                name: "角色购买配置",
                file: "plugin/purchaseList.js",
                required: true,
                validator: function (id) {
                    var roleConfig = ContentBlueprint._getRoleConfig(id);
                    if (!roleConfig) {
                        return false;
                    }
                    if (!roleConfig.purchaseId) {
                        return true;
                    }
                    return ContentBlueprint._hasPurchaseConfig(roleConfig.purchaseId);
                }
            },
            {
                name: "角色名称文案",
                file: "data/string/string_zh.js / string_en.js",
                required: true,
                validator: function (id) {
                    var roleConfig = ContentBlueprint._getRoleConfig(id);
                    return !!roleConfig && ContentBlueprint._hasStringText(roleConfig.nameStringId);
                }
            },
            {
                name: "角色描述文案",
                file: "data/string/string_zh.js / string_en.js",
                required: true,
                validator: function (id) {
                    var roleConfig = ContentBlueprint._getRoleConfig(id);
                    if (!roleConfig) {
                        return false;
                    }
                    if (roleConfig.infoDescriptionSource && roleConfig.infoDescriptionSource.type === "purchase") {
                        return ContentBlueprint._hasStringText("p_" + roleConfig.infoDescriptionSource.purchaseId, roleConfig.infoDescriptionSource.field || "des");
                    }
                    return ContentBlueprint._hasStringText(roleConfig.infoDescriptionStringId);
                }
            },
            {
                name: "角色效果文案",
                file: "data/string/string_zh.js / string_en.js",
                required: false,
                validator: function (id) {
                    var roleConfig = ContentBlueprint._getRoleConfig(id);
                    if (!roleConfig) {
                        return false;
                    }
                    if (roleConfig.infoEffectSource && roleConfig.infoEffectSource.type === "purchase") {
                        return ContentBlueprint._hasStringText("p_" + roleConfig.infoEffectSource.purchaseId, roleConfig.infoEffectSource.field || "effect");
                    }
                    if (!roleConfig.infoEffectStringId) {
                        return true;
                    }
                    return ContentBlueprint._hasStringText(roleConfig.infoEffectStringId);
                }
            },
            {
                name: "来访NPC池配置",
                file: "data/roleConfigTable.js",
                required: true,
                validator: function (id) {
                    var roleConfig = ContentBlueprint._getRoleConfig(id);
                    return !!roleConfig
                        && Array.isArray(roleConfig.visitorNpcIds)
                        && roleConfig.visitorNpcIds.length > 0
                        && ContentBlueprint._hasValidRoleTypeList(roleConfig.visitorNpcIds);
                }
            },
            {
                name: "来访解锁NPC池配置",
                file: "data/roleConfigTable.js",
                required: false,
                validator: function (id) {
                    var roleConfig = ContentBlueprint._getRoleConfig(id);
                    if (!roleConfig || roleConfig.visitorUnlockedNpcIds === undefined) {
                        return true;
                    }
                    return ContentBlueprint._hasValidRoleTypeList(roleConfig.visitorUnlockedNpcIds);
                }
            },
            {
                name: "角色动作标签配置",
                file: "data/roleConfigTable.js",
                required: false,
                validator: function (id) {
                    var roleConfig = ContentBlueprint._getRoleConfig(id);
                    if (!roleConfig || roleConfig.actionTags === undefined) {
                        return true;
                    }
                    return ContentBlueprint._hasValidStringList(roleConfig.actionTags);
                }
            },
            {
                name: "初始解锁NPC配置",
                file: "data/roleConfigTable.js",
                required: false,
                validator: function (id) {
                    var roleConfig = ContentBlueprint._getRoleConfig(id);
                    if (!roleConfig || roleConfig.unlockNpcs === undefined) {
                        return true;
                    }
                    return ContentBlueprint._hasValidRoleTypeList(roleConfig.unlockNpcs);
                }
            },
            {
                name: "角色特权物品配置",
                file: "data/roleConfigTable.js",
                required: false,
                validator: function (id) {
                    var roleConfig = ContentBlueprint._getRoleConfig(id);
                    if (!roleConfig || roleConfig.specialItems === undefined) {
                        return true;
                    }
                    return ContentBlueprint._hasValidSpecialItems(roleConfig.specialItems);
                }
            },
            {
                name: "站点NPC解锁策略配置",
                file: "data/roleConfigTable.js",
                required: false,
                validator: function (id) {
                    var roleConfig = ContentBlueprint._getRoleConfig(id);
                    return !roleConfig
                        || roleConfig.siteNpcUnlocksEnabled === undefined
                        || typeof roleConfig.siteNpcUnlocksEnabled === "boolean";
                }
            },
            {
                name: "索道能力配置",
                file: "data/roleConfigTable.js",
                required: false,
                validator: function (id) {
                    var roleConfig = ContentBlueprint._getRoleConfig(id);
                    if (!roleConfig || roleConfig.zipline === undefined) {
                        return true;
                    }
                    return ContentBlueprint._hasValidZiplineConfig(roleConfig.zipline);
                }
            }
        ]
    },
    talent: {
        fields: [
            {
                name: "天赋配置",
                file: "data/talentConfigTable.js",
                required: true,
                validator: function (id) {
                    return !!ContentBlueprint._getTalentConfig(id);
                }
            },
            {
                name: "天赋购买配置",
                file: "plugin/purchaseList.js",
                required: true,
                validator: function (id) {
                    return !!ContentBlueprint._getTalentConfig(id)
                        && ContentBlueprint._hasPurchaseConfig(id);
                }
            },
            {
                name: "天赋一级兑换",
                file: "game/medal.js",
                required: true,
                validator: function (id) {
                    return !!ContentBlueprint._getTalentConfig(id)
                        && !!ContentBlueprint._findExchangeConfig("talent", id, 1);
                }
            },
            {
                name: "天赋二级兑换",
                file: "game/medal.js",
                required: true,
                validator: function (id) {
                    var talentConfig = ContentBlueprint._getTalentConfig(id);
                    if (!talentConfig) {
                        return false;
                    }
                    if (parseInt(talentConfig.maxLevel || 1) < 2) {
                        return true;
                    }
                    return !!ContentBlueprint._findExchangeConfig("talent", id, 2);
                }
            },
            {
                name: "天赋三级兑换",
                file: "game/medal.js",
                required: true,
                validator: function (id) {
                    var talentConfig = ContentBlueprint._getTalentConfig(id);
                    if (!talentConfig) {
                        return false;
                    }
                    if (parseInt(talentConfig.maxLevel || 1) < 3) {
                        return true;
                    }
                    return !!ContentBlueprint._findExchangeConfig("talent", id, 3);
                }
            },
            {
                name: "天赋文案",
                file: "data/string/string_zh.js / string_en.js",
                required: true,
                validator: function (id) {
                    return ContentBlueprint._hasStringText("p_" + id, "name")
                        && ContentBlueprint._hasStringText("p_" + id, "des")
                        && ContentBlueprint._hasStringText("p_" + id, "effect");
                }
            }
        ]
    },
    item: {
        fields: [
            {
                name: "物品配置",
                file: "data/itemConfig.js",
                required: true,
                validator: function (id) {
                    id = ContentBlueprint._normalizeId(id);
                    return id !== null
                        && typeof itemConfig !== "undefined"
                        && !!itemConfig[id];
                }
            },
            {
                name: "物品名称文案",
                file: "data/string/string_zh.js / string_en.js",
                required: true,
                validator: function (id) {
                    return ContentBlueprint._hasStringText(id, "title");
                }
            },
            {
                name: "物品描述文案",
                file: "data/string/string_zh.js / string_en.js",
                required: true,
                validator: function (id) {
                    return ContentBlueprint._hasStringText(id, "des");
                }
            }
        ]
    },
    getBlueprint: function (type) {
        return this[type];
    }
};
