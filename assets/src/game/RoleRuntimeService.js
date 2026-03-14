var RoleRuntimeService = {
    _buildActionVisibilityGroups: [],

    _defaultConfig: {
        roomBuilds: [
            {id: 7, level: -1},
            {id: 11, level: -1},
            {id: 5, level: -1}
        ],
        temperatureBuild: {id: 5},
        restActionTypes: [],
        buildLevelCaps: {},
        actionTags: [],
        specialItems: [],
        unlockSites: [],
        unlockNpcs: [],
        visitorNpcIds: [1, 4, 2, 3],
        visitorUnlockedNpcIds: [5],
        siteNpcUnlocksEnabled: true,
        zipline: {
            enabled: false,
            timeRatio: 1,
            homeOnly: false,
            buildFromSiteOnly: false,
            buildCost: []
        },
        attrModifiers: {},
        battleModifiers: {
            precisePenalty: false,
            homeDefenseMode: "fence_and_dog"
        }
    },

    _normalizeRoleType: function (roleType) {
        roleType = parseInt(roleType);
        if (!isNaN(roleType)) {
            return roleType;
        }
        if (typeof role !== "undefined" && role && typeof role.getChoosenRoleType === "function") {
            return role.getChoosenRoleType();
        }
        if (typeof RoleType !== "undefined" && RoleType && RoleType.STRANGER !== undefined) {
            return RoleType.STRANGER;
        }
        return 6;
    },

    _getRoleConfig: function (roleType) {
        roleType = this._normalizeRoleType(roleType);
        if (typeof role !== "undefined" && role && typeof role.getRoleConfig === "function") {
            return role.getRoleConfig(roleType) || {};
        }
        if (typeof RoleConfigTable !== "undefined" && RoleConfigTable && RoleConfigTable[roleType]) {
            return RoleConfigTable[roleType];
        }
        return {};
    },

    _cloneBuildStates: function (list) {
        if (!Array.isArray(list)) {
            return [];
        }
        return list.map(function (item) {
            return {
                id: Number(item.id),
                level: Number(item.level)
            };
        }).filter(function (item) {
            return !isNaN(item.id) && !isNaN(item.level);
        });
    },

    _cloneNumberList: function (list) {
        if (!Array.isArray(list)) {
            return [];
        }
        return list.map(function (value) {
            return Number(value);
        }).filter(function (value) {
            return !isNaN(value);
        });
    },

    _cloneStringList: function (list) {
        if (!Array.isArray(list)) {
            return [];
        }
        return list.filter(function (value) {
            return typeof value === "string" && value.length > 0;
        }).slice();
    },

    _normalizeItemStackList: function (list) {
        if (!Array.isArray(list)) {
            return [];
        }
        return list.map(function (item) {
            if (typeof item === "number") {
                return {
                    itemId: item,
                    num: 1
                };
            }
            if (!item || typeof item !== "object") {
                return null;
            }
            var itemId = Number(item.itemId || item.id);
            var num = Number(item.num || 1);
            if (isNaN(itemId) || isNaN(num)) {
                return null;
            }
            return {
                itemId: itemId,
                num: num
            };
        }).filter(function (item) {
            return !!item;
        });
    },
    _normalizeSpecialItems: function (list) {
        return this._normalizeItemStackList(list);
    },

    _collectGiftUnlockSites: function (roleType) {
        var unlockSites = [];
        if (typeof npcConfig === "undefined" || !npcConfig || !npcConfig[roleType]) {
            return unlockSites;
        }
        var gifts = npcConfig[roleType].gift || [];
        gifts.forEach(function (gift) {
            if (gift && gift.hasOwnProperty("siteId")) {
                unlockSites.push(Number(gift.siteId));
            }
        });
        return unlockSites.filter(function (siteId) {
            return !isNaN(siteId);
        });
    },

    _dedupeNumberList: function (list) {
        var seen = {};
        return list.filter(function (value) {
            if (seen[value]) {
                return false;
            }
            seen[value] = true;
            return true;
        });
    },

    getRuntimeConfig: function (roleType) {
        var config = this._getRoleConfig(roleType);
        var defaultConfig = this._defaultConfig;
        var battleModifiers = config.battleModifiers || {};
        var attrModifiers = config.attrModifiers || {};
        var temperatureBuild = config.temperatureBuild || defaultConfig.temperatureBuild;
        var ziplineConfig = config.zipline || defaultConfig.zipline;
        var ziplineTimeRatio = Number(ziplineConfig.timeRatio);
        if (!(ziplineTimeRatio > 0)) {
            ziplineTimeRatio = defaultConfig.zipline.timeRatio;
        }
        var ziplineBuildCost = this._normalizeItemStackList(ziplineConfig.buildCost || defaultConfig.zipline.buildCost);

        return {
            roomBuilds: this._cloneBuildStates(config.roomBuilds || defaultConfig.roomBuilds),
            temperatureBuild: {
                id: Number(temperatureBuild.id),
                levels: this._cloneNumberList(temperatureBuild.levels)
            },
            restActionTypes: (config.restActionTypes || defaultConfig.restActionTypes).slice(),
            buildLevelCaps: config.buildLevelCaps || defaultConfig.buildLevelCaps,
            actionTags: this._cloneStringList(config.actionTags || defaultConfig.actionTags),
            specialItems: this._normalizeSpecialItems(config.specialItems || defaultConfig.specialItems),
            unlockSites: this._cloneNumberList(config.unlockSites || defaultConfig.unlockSites),
            unlockNpcs: this._cloneNumberList(config.unlockNpcs || defaultConfig.unlockNpcs),
            visitorNpcIds: this._cloneNumberList(config.visitorNpcIds || defaultConfig.visitorNpcIds),
            visitorUnlockedNpcIds: this._cloneNumberList(config.visitorUnlockedNpcIds || defaultConfig.visitorUnlockedNpcIds),
            siteNpcUnlocksEnabled: config.siteNpcUnlocksEnabled !== false,
            zipline: {
                enabled: !!ziplineConfig.enabled,
                timeRatio: ziplineTimeRatio,
                homeOnly: !!ziplineConfig.homeOnly,
                buildFromSiteOnly: !!ziplineConfig.buildFromSiteOnly,
                buildCost: ziplineBuildCost
            },
            attrModifiers: {
                hungerDecay: typeof attrModifiers.hungerDecay === "number" ? attrModifiers.hungerDecay : null
            },
            battleModifiers: {
                precisePenalty: !!battleModifiers.precisePenalty,
                homeDefenseMode: battleModifiers.homeDefenseMode || defaultConfig.battleModifiers.homeDefenseMode
            }
        };
    },

    getBuildMaxLevel: function (roleType, buildId, defaultMaxLevel) {
        if (arguments.length < 3) {
            defaultMaxLevel = buildId;
            buildId = roleType;
            roleType = undefined;
        }
        buildId = Number(buildId);
        var buildLevelCaps = this.getRuntimeConfig(roleType).buildLevelCaps || {};
        if (buildLevelCaps.hasOwnProperty(buildId)) {
            return Number(buildLevelCaps[buildId]);
        }
        return defaultMaxLevel;
    },

    getRoomBuildStates: function (roleType) {
        return this.getRuntimeConfig(roleType).roomBuilds;
    },

    applyRoomBuildStates: function (room, roleType) {
        this.getRoomBuildStates(roleType).forEach(function (buildState) {
            room.createBuild(buildState.id, buildState.level);
        });
    },

    getRestActionTypes: function (roleType) {
        return this.getRuntimeConfig(roleType).restActionTypes;
    },

    getActionTags: function (roleType) {
        return this.getRuntimeConfig(roleType).actionTags;
    },

    _hasAnyTag: function (roleTags, targetTags) {
        if (!targetTags || targetTags.length === 0) {
            return false;
        }
        for (var i = 0; i < targetTags.length; i++) {
            if (roleTags.indexOf(targetTags[i]) !== -1) {
                return true;
            }
        }
        return false;
    },

    _normalizeActionId: function (actionOrId) {
        if (actionOrId && typeof actionOrId === "object") {
            return Number(actionOrId.id);
        }
        return Number(actionOrId);
    },

    _appendUniqueList: function (targetList, extraList) {
        if (!Array.isArray(extraList) || extraList.length === 0) {
            return targetList;
        }
        targetList = Array.isArray(targetList) ? targetList : [];
        extraList.forEach(function (value) {
            if (targetList.indexOf(value) === -1) {
                targetList.push(value);
            }
        });
        return targetList;
    },

    _mergeBuildActionRule: function (baseRule, extraRule) {
        if (!extraRule || typeof extraRule !== "object") {
            return baseRule || {};
        }
        var mergedRule = baseRule || {};
        mergedRule.includeAnyTags = this._appendUniqueList(mergedRule.includeAnyTags, extraRule.includeAnyTags);
        mergedRule.excludeAnyTags = this._appendUniqueList(mergedRule.excludeAnyTags, extraRule.excludeAnyTags);
        mergedRule.hideWhenPoweredWorksiteForTags = this._appendUniqueList(
            mergedRule.hideWhenPoweredWorksiteForTags,
            extraRule.hideWhenPoweredWorksiteForTags
        );
        mergedRule.hideWhenOwnedItems = this._appendUniqueList(mergedRule.hideWhenOwnedItems, extraRule.hideWhenOwnedItems);
        mergedRule.requireOwnedItems = this._appendUniqueList(mergedRule.requireOwnedItems, extraRule.requireOwnedItems);

        if (extraRule.requirePoweredWorksite) {
            mergedRule.requirePoweredWorksite = true;
        }
        if (extraRule.purchaseLock) {
            mergedRule.purchaseLock = extraRule.purchaseLock;
        }
        return mergedRule;
    },

    _getConfiguredBuildActionRule: function (actionOrId) {
        if (!actionOrId || typeof actionOrId !== "object") {
            return null;
        }
        if (actionOrId.runtimeRule && typeof actionOrId.runtimeRule === "object") {
            return actionOrId.runtimeRule;
        }
        if (actionOrId.config && actionOrId.config.runtimeRule && typeof actionOrId.config.runtimeRule === "object") {
            return actionOrId.config.runtimeRule;
        }
        return null;
    },

    _getBuildActionRules: function (actionOrId) {
        var actionId = this._normalizeActionId(actionOrId);
        var rules = [];
        var configuredRule = this._getConfiguredBuildActionRule(actionOrId);
        if (configuredRule) {
            rules.push(configuredRule);
        }
        if (isNaN(actionId)) {
            return rules;
        }
        for (var i = 0; i < this._buildActionVisibilityGroups.length; i++) {
            var rule = this._buildActionVisibilityGroups[i];
            if (rule.actionIds.indexOf(actionId) !== -1) {
                rules.push(rule);
            }
        }
        return rules;
    },

    _getBuildActionRule: function (actionOrId) {
        var mergedRule = {};
        this._getBuildActionRules(actionOrId).forEach(function (rule) {
            mergedRule = this._mergeBuildActionRule(mergedRule, rule);
        }, this);
        return mergedRule;
    },

    _hasStorageItem: function (context, itemId) {
        if (!context) {
            return false;
        }
        if (typeof context.hasStorageItem === "function") {
            return !!context.hasStorageItem(itemId);
        }
        if (context.inventoryState && Object.prototype.hasOwnProperty.call(context.inventoryState, itemId)) {
            return !!context.inventoryState[itemId];
        }
        return false;
    },

    _hasAnyOwnedItem: function (context, itemIds) {
        if (!Array.isArray(itemIds) || itemIds.length === 0) {
            return false;
        }
        for (var i = 0; i < itemIds.length; i++) {
            if (this._hasStorageItem(context, itemIds[i])) {
                return true;
            }
        }
        return false;
    },

    _hasAllOwnedItems: function (context, itemIds) {
        if (!Array.isArray(itemIds) || itemIds.length === 0) {
            return true;
        }
        for (var i = 0; i < itemIds.length; i++) {
            if (!this._hasStorageItem(context, itemIds[i])) {
                return false;
            }
        }
        return true;
    },

    isBuildActionVisible: function (actionOrId, roleType, context) {
        var rule = this._getBuildActionRule(actionOrId);
        var roleTags = this.getActionTags(roleType);
        context = context || {};

        if (rule.includeAnyTags && !this._hasAnyTag(roleTags, rule.includeAnyTags)) {
            return false;
        }
        if (rule.excludeAnyTags && this._hasAnyTag(roleTags, rule.excludeAnyTags)) {
            return false;
        }
        if (rule.requirePoweredWorksite && !context.isWorkSitePowered) {
            return false;
        }
        if (rule.hideWhenPoweredWorksiteForTags
            && context.isWorkSitePowered
            && this._hasAnyTag(roleTags, rule.hideWhenPoweredWorksiteForTags)) {
            return false;
        }
        if (rule.hideWhenOwnedItems && this._hasAnyOwnedItem(context, rule.hideWhenOwnedItems)) {
            return false;
        }
        if (rule.requireOwnedItems && !this._hasAllOwnedItems(context, rule.requireOwnedItems)) {
            return false;
        }
        return true;
    },

    getBuildActionLockState: function (actionOrId) {
        var state = {
            isLocked: false,
            purchaseId: null
        };
        var rule = this._getBuildActionRule(actionOrId);
        var purchaseLock = rule.purchaseLock;
        if (!purchaseLock) {
            return state;
        }

        state.purchaseId = purchaseLock.purchaseId || null;
        var checkFn = purchaseLock.checkFn
            && typeof IAPPackage !== "undefined"
            && IAPPackage
            && typeof IAPPackage[purchaseLock.checkFn] === "function"
            ? IAPPackage[purchaseLock.checkFn]
            : null;
        state.isLocked = checkFn ? !checkFn.call(IAPPackage) : false;
        return state;
    },

    applyBuildActionRuntimeState: function (action, roleType, context) {
        if (!action) {
            return false;
        }
        var lockState = this.getBuildActionLockState(action);
        action.isLocked = lockState.isLocked;
        action.purchaseId = lockState.purchaseId;
        return this.isBuildActionVisible(action, roleType, context);
    },

    ensureSpecialItems: function (playerObj) {
        if (!playerObj || !playerObj.storage) {
            return;
        }
        this.getRuntimeConfig(playerObj.roleType).specialItems.forEach(function (itemInfo) {
            var currentNum = playerObj.storage.getNumByItemId(itemInfo.itemId) || 0;
            if (currentNum < itemInfo.num) {
                playerObj.storage.increaseItem(itemInfo.itemId, itemInfo.num - currentNum);
            }
        });
    },

    getHourlyStarveChange: function (roleType, changeConfig) {
        var defaultValue = 0;
        if (changeConfig && changeConfig[0] && changeConfig[0].length > 0) {
            defaultValue = changeConfig[0][0];
        }
        var hungerDecay = this.getRuntimeConfig(roleType).attrModifiers.hungerDecay;
        if (typeof hungerDecay !== "number") {
            return defaultValue;
        }
        if (changeConfig && changeConfig[0] && changeConfig[0].length > 1) {
            return changeConfig[0][1];
        }
        return Math.round(defaultValue * hungerDecay);
    },

    isTemperatureBuildActive: function (playerObj) {
        if (!playerObj || !playerObj.room) {
            return false;
        }
        var temperatureBuild = this.getRuntimeConfig(playerObj.roleType).temperatureBuild;
        if (!temperatureBuild || isNaN(temperatureBuild.id)) {
            return false;
        }
        var build = playerObj.room.getBuild(temperatureBuild.id);
        if (!build || typeof build.isActive !== "function" || !build.isActive()) {
            return false;
        }
        if (!temperatureBuild.levels || temperatureBuild.levels.length === 0) {
            return true;
        }
        return temperatureBuild.levels.indexOf(build.level) !== -1;
    },

    getTemperatureBonus: function (playerObj, buildBonus) {
        return this.isTemperatureBuildActive(playerObj) ? buildBonus : 0;
    },

    hasPrecisePenalty: function (roleType) {
        return this.getRuntimeConfig(roleType).battleModifiers.precisePenalty;
    },

    getSpiritPrecisePenalty: function (playerObj) {
        if (!playerObj || !this.hasPrecisePenalty(playerObj.roleType)) {
            return 0;
        }
        return (100 - memoryUtil.decode(playerObj.spirit)) * 0.0035;
    },

    getVigourPrecisePenalty: function (playerObj) {
        if (!playerObj || !this.hasPrecisePenalty(playerObj.roleType)) {
            return 0;
        }
        var vigour = memoryUtil.decode(playerObj.vigour);
        var vigourMax = memoryUtil.decode(playerObj.vigourMax);
        if (!(vigourMax > 0)) {
            vigourMax = 100;
        }
        var vigourRatio = Math.max(0, Math.min(1, vigour / vigourMax));
        return (1 - vigourRatio) * 0.35;
    },

    getHomeDefense: function (playerObj) {
        if (!playerObj || !playerObj.room || !playerObj.dog) {
            return 0;
        }
        var homeDefenseMode = this.getRuntimeConfig(playerObj.roleType).battleModifiers.homeDefenseMode;
        var homeDef = 0;
        if (homeDefenseMode === "fence_and_dog") {
            var fenceBuild = playerObj.room.getBuild(11);
            if (fenceBuild && fenceBuild.level >= 0) {
                homeDef += (fenceBuild.level + 1) * 10;
            }
        }
        if (playerObj.dog.isActive()) {
            homeDef += 15;
        }
        return homeDef;
    },

    getInitialUnlockSites: function (roleType) {
        var runtimeConfig = this.getRuntimeConfig(roleType);
        var unlockSites = runtimeConfig.unlockSites.concat(this._collectGiftUnlockSites(this._normalizeRoleType(roleType)));
        return this._dedupeNumberList(unlockSites);
    },

    getInitialUnlockNpcs: function (roleType) {
        return this._dedupeNumberList(this.getRuntimeConfig(roleType).unlockNpcs);
    },

    getVisitorNpcPool: function (roleType, npcManager) {
        var runtimeConfig = this.getRuntimeConfig(roleType);
        var npcPool = runtimeConfig.visitorNpcIds.slice();
        runtimeConfig.visitorUnlockedNpcIds.forEach(function (npcId) {
            var npc = npcManager && typeof npcManager.getNPC === "function"
                ? npcManager.getNPC(npcId)
                : null;
            if (npc && npc.isUnlocked) {
                npcPool.push(npcId);
            }
        });
        npcPool = this._dedupeNumberList(npcPool);
        if (npcPool.length === 0) {
            return this._defaultConfig.visitorNpcIds.slice();
        }
        return npcPool;
    },
    canUnlockNpcsFromSite: function (roleType) {
        return this.getRuntimeConfig(roleType).siteNpcUnlocksEnabled !== false;
    },
    getZiplineConfig: function (roleType) {
        return this.getRuntimeConfig(roleType).zipline;
    },
    isZiplineHomeOnly: function (roleType) {
        return !!this.getZiplineConfig(roleType).homeOnly;
    },
    isZiplineBuildFromSiteOnly: function (roleType) {
        return !!this.getZiplineConfig(roleType).buildFromSiteOnly;
    },
    getZiplineBuildCost: function (roleType) {
        return this._normalizeItemStackList(this.getZiplineConfig(roleType).buildCost || []);
    },
    getZiplineRefundCost: function (roleType) {
        return this.getZiplineBuildCost(roleType).map(function (itemInfo) {
            var refundNum = Math.floor(Number(itemInfo.num) * 0.5);
            if (!(refundNum > 0)) {
                return null;
            }
            return {
                itemId: itemInfo.itemId,
                num: refundNum
            };
        }).filter(function (itemInfo) {
            return !!itemInfo;
        });
    },
    supportsZipline: function (roleType) {
        return !!this.getZiplineConfig(roleType).enabled;
    },
    isZiplineFrameworkAvailable: function (playerObj) {
        return !!(playerObj
            && this.supportsZipline(playerObj.roleType)
            && playerObj.ziplineNetwork);
    },

    applyInitialUnlocks: function (mapObj, roleType) {
        this.getInitialUnlockSites(roleType).forEach(function (siteId) {
            mapObj.unlockSite(siteId);
        });
        this.getInitialUnlockNpcs(roleType).forEach(function (npcId) {
            mapObj.unlockNpc(npcId);
        });
    }
};
