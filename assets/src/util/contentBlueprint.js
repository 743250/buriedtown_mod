/**
 * ContentBlueprint describes the real content sources used by the current
 * role / talent / item / build pipelines so validators can catch missing links early.
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
    _getSiteConfig: function (id) {
        id = this._normalizeId(id);
        if (id === null || typeof siteConfig === "undefined" || !siteConfig) {
            return null;
        }
        return siteConfig[id] || null;
    },
    _getNpcConfig: function (id) {
        id = this._normalizeId(id);
        if (id === null || typeof npcConfig === "undefined" || !npcConfig) {
            return null;
        }
        return npcConfig[id] || null;
    },
    _getBuildConfig: function (id) {
        id = this._normalizeId(id);
        if (id === null || typeof buildConfig === "undefined" || !buildConfig) {
            return null;
        }
        return buildConfig[id] || null;
    },
    _getBuildActionConfig: function (id) {
        id = this._normalizeId(id);
        if (id === null || typeof buildActionConfig === "undefined" || !buildActionConfig) {
            return null;
        }
        return buildActionConfig[id] || null;
    },
    _getFormulaConfig: function (id) {
        id = this._normalizeId(id);
        if (id === null || typeof formulaConfig === "undefined" || !formulaConfig) {
            return null;
        }
        return formulaConfig[id] || null;
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
    _isFiniteNumber: function (value) {
        return value !== null && value !== undefined && value !== "" && isFinite(Number(value));
    },
    _hasValidCoordinate: function (coordinate) {
        return !!coordinate
            && this._isFiniteNumber(coordinate.x)
            && this._isFiniteNumber(coordinate.y);
    },
    _hasValidDifficultyRange: function (difficulty) {
        if (!Array.isArray(difficulty) || difficulty.length !== 2) {
            return false;
        }
        var minDifficulty = Number(difficulty[0]);
        var maxDifficulty = Number(difficulty[1]);
        return isFinite(minDifficulty)
            && isFinite(maxDifficulty)
            && minDifficulty >= 1
            && maxDifficulty >= minDifficulty;
    },
    _hasResolvableItemId: function (itemId) {
        if (itemId === undefined || itemId === null || typeof itemConfig === "undefined" || !itemConfig) {
            return false;
        }
        var itemIdStr = "" + itemId;
        if (itemIdStr.indexOf("*") !== -1) {
            return typeof utils !== "undefined"
                && utils
                && typeof utils.getRandomItemId === "function"
                && !!utils.getRandomItemId(itemIdStr);
        }
        var normalizedItemId = this._normalizeId(itemIdStr);
        return normalizedItemId !== null && !!itemConfig[normalizedItemId];
    },
    _hasValidItemStackList: function (list, allowEmpty) {
        if (!Array.isArray(list)) {
            return false;
        }
        if (list.length === 0) {
            return !!allowEmpty;
        }
        for (var i = 0; i < list.length; i++) {
            var item = list[i];
            if (!item || !ContentBlueprint._hasResolvableItemId(item.itemId)) {
                return false;
            }
            if (!ContentBlueprint._isFiniteNumber(item.num) || Number(item.num) <= 0) {
                return false;
            }
        }
        return true;
    },
    _hasValidBuildRef: function (buildRef, allowEmpty) {
        if (buildRef === undefined || buildRef === null) {
            return !!allowEmpty;
        }
        if (Array.isArray(buildRef)) {
            return !!allowEmpty && buildRef.length === 0;
        }
        if (typeof buildRef !== "object") {
            return false;
        }

        var buildId = ContentBlueprint._normalizeId(buildRef.bid !== undefined ? buildRef.bid : buildRef.id);
        var buildLevel = Number(buildRef.level);
        var configs = ContentBlueprint._getBuildConfig(buildId);
        return !!configs
            && ContentBlueprint._isFiniteNumber(buildLevel)
            && buildLevel >= -1
            && buildLevel < configs.length;
    },
    _hasValidBuildStateList: function (list) {
        if (!Array.isArray(list)) {
            return false;
        }
        for (var i = 0; i < list.length; i++) {
            if (!ContentBlueprint._hasValidBuildRef(list[i])) {
                return false;
            }
        }
        return true;
    },
    _hasValidFormulaIdList: function (list) {
        if (!Array.isArray(list)) {
            return false;
        }
        for (var i = 0; i < list.length; i++) {
            if (!ContentBlueprint._getFormulaConfig(list[i])) {
                return false;
            }
        }
        return true;
    },
    _getItemDisplayId: function (itemId) {
        itemId = this._normalizeId(itemId);
        if (itemId === null) {
            return null;
        }
        if (typeof WeaponCraftService !== "undefined"
            && WeaponCraftService
            && typeof WeaponCraftService.getDisplayItemId === "function") {
            itemId = this._normalizeId(WeaponCraftService.getDisplayItemId(itemId));
        }
        if (typeof itemConfig !== "undefined"
            && itemConfig
            && itemConfig[itemId]
            && itemConfig[itemId].displayItemId !== undefined) {
            var displayItemId = this._normalizeId(itemConfig[itemId].displayItemId);
            if (displayItemId !== null) {
                itemId = displayItemId;
            }
        }
        if (itemId === 1301091) {
            return 1301011;
        }
        return itemId;
    },
    _hasSpriteFrame: function (spriteFrameName) {
        if (!spriteFrameName) {
            return false;
        }
        if (typeof autoSpriteFrameController === "undefined"
            || !autoSpriteFrameController
            || typeof autoSpriteFrameController.getSpriteFrameFromSpriteName !== "function") {
            return true;
        }
        if (spriteFrameName.charAt(0) === "#") {
            spriteFrameName = spriteFrameName.substring(1);
        }
        try {
            return !!autoSpriteFrameController.getSpriteFrameFromSpriteName(spriteFrameName);
        } catch (e) {
            return false;
        }
    },
    _hasValidSiteItemList: function (list, countFieldName) {
        if (!Array.isArray(list)) {
            return false;
        }
        for (var i = 0; i < list.length; i++) {
            var item = list[i];
            if (!item || !ContentBlueprint._hasResolvableItemId(item.itemId)) {
                return false;
            }
            if (!ContentBlueprint._isFiniteNumber(item[countFieldName]) || Number(item[countFieldName]) < 0) {
                return false;
            }
        }
        return true;
    },
    _hasValidSiteIdList: function (list) {
        if (!Array.isArray(list)) {
            return false;
        }
        for (var i = 0; i < list.length; i++) {
            if (!ContentBlueprint._getSiteConfig(list[i])) {
                return false;
            }
        }
        return true;
    },
    _hasValidNpcIdList: function (list) {
        if (!Array.isArray(list)) {
            return false;
        }
        for (var i = 0; i < list.length; i++) {
            if (!ContentBlueprint._getNpcConfig(list[i])) {
                return false;
            }
        }
        return true;
    },
    _hasValidSiteUnlockValue: function (unlockValue) {
        if (!unlockValue || typeof unlockValue !== "object") {
            return false;
        }
        if (unlockValue.site !== undefined && !ContentBlueprint._hasValidSiteIdList(unlockValue.site)) {
            return false;
        }
        if (unlockValue.npc !== undefined && !ContentBlueprint._hasValidNpcIdList(unlockValue.npc)) {
            return false;
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
    _hasValidPositiveNumberList: function (list) {
        if (!Array.isArray(list) || list.length === 0) {
            return false;
        }
        for (var i = 0; i < list.length; i++) {
            if (!ContentBlueprint._isFiniteNumber(list[i]) || Number(list[i]) <= 0) {
                return false;
            }
        }
        return true;
    },
    _hasValidBuildActionEffect: function (effect) {
        if (!effect || typeof effect !== "object" || Array.isArray(effect)) {
            return false;
        }
        var hasAnyEffectKey = false;
        for (var key in effect) {
            hasAnyEffectKey = true;
            if (!ContentBlueprint._isFiniteNumber(effect[key])) {
                return false;
            }
        }
        return hasAnyEffectKey;
    },
    _walkBuildActionEntries: function (configList, entryValidator) {
        if (!Array.isArray(configList) || configList.length === 0) {
            return false;
        }
        for (var i = 0; i < configList.length; i++) {
            var entry = configList[i];
            if (Array.isArray(entry)) {
                if (!ContentBlueprint._walkBuildActionEntries(entry, entryValidator)) {
                    return false;
                }
                continue;
            }
            if (!entry || typeof entry !== "object") {
                return false;
            }
            if (entryValidator && !entryValidator(entry)) {
                return false;
            }
        }
        return true;
    },
    _isSpecialSiteWithoutRooms: function (id) {
        id = this._normalizeId(id);
        return id === 61 || id === 100 || id === 202 || id === 204;
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
                name: "角色初始房间建筑配置",
                file: "data/roleConfigTable.js / data/buildConfig.js",
                required: false,
                validator: function (id) {
                    var roleConfig = ContentBlueprint._getRoleConfig(id);
                    if (!roleConfig || roleConfig.roomBuilds === undefined) {
                        return true;
                    }
                    return ContentBlueprint._hasValidBuildStateList(roleConfig.roomBuilds);
                }
            },
            {
                name: "角色初始解锁站点配置",
                file: "data/roleConfigTable.js / data/siteConfig.js",
                required: false,
                validator: function (id) {
                    var roleConfig = ContentBlueprint._getRoleConfig(id);
                    if (!roleConfig || roleConfig.unlockSites === undefined) {
                        return true;
                    }
                    return ContentBlueprint._hasValidSiteIdList(roleConfig.unlockSites);
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
    build: {
        fields: [
            {
                name: "建筑配置",
                file: "data/buildConfig.js",
                required: true,
                validator: function (id) {
                    return !!ContentBlueprint._getBuildConfig(id);
                }
            },
            {
                name: "建筑等级结构配置",
                file: "data/buildConfig.js",
                required: true,
                validator: function (id) {
                    var configs = ContentBlueprint._getBuildConfig(id);
                    if (!Array.isArray(configs) || configs.length === 0) {
                        return false;
                    }
                    for (var i = 0; i < configs.length; i++) {
                        if (!configs[i] || parseInt(configs[i].id) !== parseInt(id)) {
                            return false;
                        }
                    }
                    return true;
                }
            },
            {
                name: "建筑升级成本配置",
                file: "data/buildConfig.js",
                required: true,
                validator: function (id) {
                    var configs = ContentBlueprint._getBuildConfig(id);
                    if (!Array.isArray(configs) || configs.length === 0) {
                        return false;
                    }
                    for (var i = 0; i < configs.length; i++) {
                        if (!ContentBlueprint._hasValidItemStackList(configs[i].cost || [], true)) {
                            return false;
                        }
                    }
                    return true;
                }
            },
            {
                name: "建筑升级条件引用",
                file: "data/buildConfig.js",
                required: true,
                validator: function (id) {
                    var configs = ContentBlueprint._getBuildConfig(id);
                    if (!Array.isArray(configs) || configs.length === 0) {
                        return false;
                    }
                    for (var i = 0; i < configs.length; i++) {
                        if (!ContentBlueprint._hasValidBuildRef(configs[i].condition, true)) {
                            return false;
                        }
                    }
                    return true;
                }
            },
            {
                name: "建筑产线公式引用",
                file: "data/buildConfig.js / data/formulaConfig.js",
                required: true,
                validator: function (id) {
                    var configs = ContentBlueprint._getBuildConfig(id);
                    if (!Array.isArray(configs) || configs.length === 0) {
                        return false;
                    }
                    for (var i = 0; i < configs.length; i++) {
                        if (!ContentBlueprint._hasValidFormulaIdList(configs[i].produceList)) {
                            return false;
                        }
                    }
                    return true;
                }
            },
            {
                name: "建筑建造时间配置",
                file: "data/buildConfig.js",
                required: false,
                validator: function (id) {
                    var configs = ContentBlueprint._getBuildConfig(id);
                    if (!Array.isArray(configs) || configs.length === 0) {
                        return false;
                    }
                    for (var i = 0; i < configs.length; i++) {
                        if (configs[i].createTime === undefined) {
                            continue;
                        }
                        if (!ContentBlueprint._isFiniteNumber(configs[i].createTime) || Number(configs[i].createTime) < 0) {
                            return false;
                        }
                    }
                    return true;
                }
            },
            {
                name: "建筑运行时激活条件配置",
                file: "data/buildConfig.js",
                required: false,
                validator: function (id) {
                    var configs = ContentBlueprint._getBuildConfig(id);
                    if (!Array.isArray(configs) || configs.length === 0) {
                        return false;
                    }
                    for (var i = 0; i < configs.length; i++) {
                        if (configs[i].requirePoweredWorksite === undefined) {
                            continue;
                        }
                        if (typeof configs[i].requirePoweredWorksite !== "boolean") {
                            return false;
                        }
                    }
                    return true;
                }
            }
        ]
    },
    "build-action": {
        fields: [
            {
                name: "建筑动作配置",
                file: "data/buildActionConfig.js",
                required: true,
                validator: function (id) {
                    var configs = ContentBlueprint._getBuildActionConfig(id);
                    return ContentBlueprint._walkBuildActionEntries(configs, function () {
                        return true;
                    });
                }
            },
            {
                name: "建筑动作所属建筑引用",
                file: "data/buildActionConfig.js / data/buildConfig.js",
                required: true,
                validator: function (id) {
                    return !!ContentBlueprint._getBuildConfig(id);
                }
            },
            {
                name: "建筑动作成本配置",
                file: "data/buildActionConfig.js",
                required: false,
                validator: function (id) {
                    var configs = ContentBlueprint._getBuildActionConfig(id);
                    return ContentBlueprint._walkBuildActionEntries(configs, function (entry) {
                        return entry.cost === undefined || ContentBlueprint._hasValidItemStackList(entry.cost, true);
                    });
                }
            },
            {
                name: "建筑动作产出配置",
                file: "data/buildActionConfig.js",
                required: false,
                validator: function (id) {
                    var configs = ContentBlueprint._getBuildActionConfig(id);
                    return ContentBlueprint._walkBuildActionEntries(configs, function (entry) {
                        return entry.produce === undefined || ContentBlueprint._hasValidItemStackList(entry.produce, true);
                    });
                }
            },
            {
                name: "建筑动作效果配置",
                file: "data/buildActionConfig.js",
                required: false,
                validator: function (id) {
                    var configs = ContentBlueprint._getBuildActionConfig(id);
                    return ContentBlueprint._walkBuildActionEntries(configs, function (entry) {
                        return entry.effect === undefined || ContentBlueprint._hasValidBuildActionEffect(entry.effect);
                    });
                }
            },
            {
                name: "建筑动作时间/倍率配置",
                file: "data/buildActionConfig.js",
                required: true,
                validator: function (id) {
                    var configs = ContentBlueprint._getBuildActionConfig(id);
                    return ContentBlueprint._walkBuildActionEntries(configs, function (entry) {
                        if (entry.makeTime !== undefined
                            && (!ContentBlueprint._isFiniteNumber(entry.makeTime) || Number(entry.makeTime) < 0)) {
                            return false;
                        }
                        if (entry.max !== undefined
                            && (!ContentBlueprint._isFiniteNumber(entry.max) || Number(entry.max) < 0)) {
                            return false;
                        }
                        if (entry.rate !== undefined
                            && (!ContentBlueprint._isFiniteNumber(entry.rate) || Number(entry.rate) <= 0)) {
                            return false;
                        }
                        if (entry.placedTime !== undefined && !ContentBlueprint._hasValidPositiveNumberList(entry.placedTime)) {
                            return false;
                        }
                        return true;
                    });
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
            },
            {
                name: "物品显示映射",
                file: "data/itemConfig.js",
                required: false,
                validator: function (id) {
                    id = ContentBlueprint._normalizeId(id);
                    if (id === null || typeof itemConfig === "undefined" || !itemConfig || !itemConfig[id]) {
                        return false;
                    }
                    if (itemConfig[id].displayItemId === undefined) {
                        return true;
                    }
                    var displayItemId = ContentBlueprint._normalizeId(itemConfig[id].displayItemId);
                    return displayItemId !== null && !!itemConfig[displayItemId];
                }
            },
            {
                name: "物品图标资源",
                file: "res/icon.plist",
                required: false,
                validator: function (id) {
                    var displayItemId = ContentBlueprint._getItemDisplayId(id);
                    return displayItemId !== null && ContentBlueprint._hasSpriteFrame("icon_item_" + displayItemId + ".png");
                }
            },
            {
                name: "物品详情图资源",
                file: "res/dig_item.plist",
                required: false,
                validator: function (id) {
                    var displayItemId = ContentBlueprint._getItemDisplayId(id);
                    return displayItemId !== null && ContentBlueprint._hasSpriteFrame("dig_item_" + displayItemId + ".png");
                }
            }
        ]
    },
    site: {
        fields: [
            {
                name: "绔欑偣閰嶇疆",
                file: "data/siteConfig.js",
                required: true,
                validator: function (id) {
                    return !!ContentBlueprint._getSiteConfig(id);
                }
            },
            {
                name: "绔欑偣鍚嶇О鏂囨",
                file: "data/string/string_zh.js / string_en.js",
                required: true,
                validator: function (id) {
                    return ContentBlueprint._hasStringText("site_" + id, "name");
                }
            },
            {
                name: "绔欑偣鎻忚堪鏂囨",
                file: "data/string/string_zh.js / string_en.js",
                required: true,
                validator: function (id) {
                    return ContentBlueprint._hasStringText("site_" + id, "des");
                }
            },
            {
                name: "绔欑偣鍧愭爣閰嶇疆",
                file: "data/siteConfig.js",
                required: true,
                validator: function (id) {
                    var config = ContentBlueprint._getSiteConfig(id);
                    return !!config && ContentBlueprint._hasValidCoordinate(config.coordinate);
                }
            },
            {
                name: "绔欑偣鎴樻枟/宸ヤ綔鎴块棿閰嶇疆",
                file: "data/siteConfig.js",
                required: true,
                validator: function (id) {
                    if (ContentBlueprint._isSpecialSiteWithoutRooms(id)) {
                        return true;
                    }
                    var config = ContentBlueprint._getSiteConfig(id);
                    return !!config
                        && ContentBlueprint._isFiniteNumber(config.battleRoom)
                        && Number(config.battleRoom) >= 0
                        && ContentBlueprint._isFiniteNumber(config.workRoom)
                        && Number(config.workRoom) >= 0
                        && ContentBlueprint._hasValidDifficultyRange(config.difficulty)
                        && ContentBlueprint._isFiniteNumber(config.produceValue)
                        && Number(config.produceValue) >= 0;
                }
            },
            {
                name: "绔欑偣鎺夎惤姹犻厤缃",
                file: "data/siteConfig.js",
                required: true,
                validator: function (id) {
                    var config = ContentBlueprint._getSiteConfig(id);
                    return !!config && ContentBlueprint._hasValidSiteItemList(config.produceList, "weight");
                }
            },
            {
                name: "绔欑偣鍥哄畾鎺夎惤閰嶇疆",
                file: "data/siteConfig.js",
                required: false,
                validator: function (id) {
                    var config = ContentBlueprint._getSiteConfig(id);
                    if (!config || config.fixedProduceList === undefined) {
                        return true;
                    }
                    return ContentBlueprint._hasValidSiteItemList(config.fixedProduceList, "num");
                }
            },
            {
                name: "绔欑偣瑙ｉ攣閰嶇疆",
                file: "data/siteConfig.js",
                required: false,
                validator: function (id) {
                    var config = ContentBlueprint._getSiteConfig(id);
                    if (!config || config.unlockValue === undefined) {
                        return true;
                    }
                    return ContentBlueprint._hasValidSiteUnlockValue(config.unlockValue);
                }
            },
            {
                name: "绔欑偣瀵嗗閰嶇疆",
                file: "data/siteConfig.js / data/secretRooms.js",
                required: false,
                validator: function (id) {
                    var config = ContentBlueprint._getSiteConfig(id);
                    if (!config || config.secretRoomsId === undefined || config.secretRoomsId === null) {
                        return true;
                    }
                    return typeof secretRooms !== "undefined"
                        && secretRooms
                        && !!secretRooms[parseInt(config.secretRoomsId)];
                }
            },
            {
                name: "绔欑偣闃插尽閰嶇疆",
                file: "data/siteConfig.js",
                required: false,
                validator: function (id) {
                    var config = ContentBlueprint._getSiteConfig(id);
                    return !config
                        || config.def === undefined
                        || (ContentBlueprint._isFiniteNumber(config.def) && Number(config.def) >= 0);
                }
            }
        ]
    },
    getBlueprint: function (type) {
        return this[type];
    }
};
