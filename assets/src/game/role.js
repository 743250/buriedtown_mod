/**
 * Created by lancelot on 16/3/1.
 */

var RoleType = {
    //根据NPC ID
    STRANGER: 6,
    LUO: 1,
    YAZI: 4,
    JIN: 2,
    BIER: 5,
    JIE: 3,
    KING: 7,
    BELL: 8

};

var _fallbackRoleConfigTable = {
    1: {roleType: 1, exchangeId: 1001, purchaseId: 108, nameStringId: 1313, selectionDescriptionStringId: 1314, infoDescriptionSource: {type: "purchase", purchaseId: 108, field: "des"}, infoEffectSource: {type: "purchase", purchaseId: 108, field: "effect"}, avatarFallback: "npc_dig_1.png", selectionOrder: 1, npcId: 1},
    2: {roleType: 2, exchangeId: 1003, purchaseId: 110, nameStringId: 1319, selectionDescriptionStringId: 1315, infoDescriptionStringId: 1324, infoEffectStringId: 1325, avatarFallback: "npc_dig_2.png", selectionOrder: 3, npcId: 2},
    3: {roleType: 3, exchangeId: 1005, purchaseId: 112, nameStringId: 1331, selectionDescriptionStringId: 1332, infoDescriptionStringId: 1333, infoEffectStringId: 1334, avatarFallback: "npc_dig_3.png", selectionOrder: 5, npcId: 3},
    4: {roleType: 4, exchangeId: 1002, purchaseId: 109, nameStringId: 1321, selectionDescriptionStringId: 1322, infoDescriptionSource: {type: "purchase", purchaseId: 109, field: "des"}, infoEffectSource: {type: "purchase", purchaseId: 109, field: "effect"}, avatarFallback: "npc_dig_4.png", selectionOrder: 2, npcId: 4},
    5: {roleType: 5, exchangeId: 1004, purchaseId: 111, nameStringId: 1327, selectionDescriptionStringId: 1328, infoDescriptionStringId: 1329, infoEffectStringId: 1330, avatarFallback: "npc_dig_5.png", selectionOrder: 4, npcId: 5},
    6: {roleType: 6, exchangeId: null, purchaseId: null, nameStringId: 1311, selectionDescriptionStringId: 1312, infoDescriptionStringId: 1317, infoEffectStringId: 1318, avatarFallback: "npc_dig_6.png", selectionOrder: 0, npcId: 6},
    7: {roleType: 7, exchangeId: 1006, purchaseId: 113, nameStringId: 1342, selectionDescriptionStringId: 1343, infoDescriptionStringId: 1343, infoEffectStringId: 1344, avatarFallback: "npc_dig_6.png", selectionOrder: 7, npcId: 7},
    8: {roleType: 8, exchangeId: 1007, purchaseId: 114, nameStringId: 1345, selectionDescriptionStringId: 1346, infoDescriptionSource: {type: "purchase", purchaseId: 114, field: "des"}, infoEffectSource: {type: "purchase", purchaseId: 114, field: "effect"}, avatarFallback: "npc_dig_7.png", mapRoleType: 7, selectionOrder: 6, npcId: 8}
};

var _defaultRoleInfo = {
    nameStringId: 1340,
    infoDescriptionStringId: 1320,
    infoEffectStringId: null,
    avatarFallback: "npc_dig_6.png"
};

var role = {
    _getRoleConfigTable: function () {
        if (typeof RoleConfigTable !== "undefined" && RoleConfigTable) {
            return RoleConfigTable;
        }
        return _fallbackRoleConfigTable;
    },
    _getRoleStringValue: function (stringId) {
        if (stringId === undefined || stringId === null || typeof stringUtil === "undefined" || !stringUtil) {
            return "";
        }
        var str = stringUtil.getString(stringId);
        return typeof str === "string" ? str : "";
    },
    _getRoleTextFromSource: function (source, fallbackStringId) {
        if (source && typeof source === "object" && source.type === "purchase") {
            var purchaseId = parseInt(source.purchaseId);
            var fieldName = source.field || "des";
            if (!isNaN(purchaseId) && typeof stringUtil !== "undefined" && stringUtil) {
                var purchaseStringConfig = stringUtil.getString("p_" + purchaseId);
                if (purchaseStringConfig
                    && typeof purchaseStringConfig === "object"
                    && typeof purchaseStringConfig[fieldName] === "string") {
                    return purchaseStringConfig[fieldName];
                }
            }
        }
        return this._getRoleStringValue(fallbackStringId);
    },
    getRoleConfig: function (roleType) {
        roleType = parseInt(roleType);
        if (isNaN(roleType)) {
            return null;
        }
        return this._getRoleConfigTable()[roleType] || null;
    },
    getAllRoleTypes: function () {
        var table = this._getRoleConfigTable();
        return Object.keys(table).map(function (key) {
            return parseInt(key);
        }).filter(function (roleType) {
            return !isNaN(roleType);
        }).sort(function (a, b) {
            var configA = table[a] || {};
            var configB = table[b] || {};
            var orderA = isFinite(configA.selectionOrder) ? configA.selectionOrder : 999999;
            var orderB = isFinite(configB.selectionOrder) ? configB.selectionOrder : 999999;
            if (orderA !== orderB) {
                return orderA - orderB;
            }
            return a - b;
        });
    },
    getRoleSelectionList: function () {
        var self = this;
        return this.getAllRoleTypes().map(function (roleType) {
            if (typeof ConfigValidator !== "undefined" && ConfigValidator && typeof ConfigValidator.warnIfInvalid === "function") {
                ConfigValidator.warnIfInvalid("role", roleType, "role.getRoleSelectionList");
            }
            var config = self.getRoleConfig(roleType) || {};
            return {
                id: roleType,
                name: self._getRoleStringValue(config.nameStringId),
                des: self._getRoleStringValue(config.selectionDescriptionStringId),
                selectionOrder: isFinite(config.selectionOrder) ? config.selectionOrder : roleType
            };
        });
    },
    getRoleSelectionConfig: function () {
        var selectionList = this.getRoleSelectionList();
        var positionToRoleType = {};
        var roleTypeToPosition = {};
        var randomRoleTypeList = [];

        selectionList.forEach(function (item, index) {
            positionToRoleType[index] = item.id;
            roleTypeToPosition[item.id] = index;
            randomRoleTypeList.push(item.id);
        });

        return {
            positionToRoleType: positionToRoleType,
            randomRoleTypeList: randomRoleTypeList,
            roleTypeToPosition: roleTypeToPosition,
            roleList: selectionList
        };
    },
    getExchangeIdByRoleType: function (roleType) {
        var config = this.getRoleConfig(roleType);
        return config ? config.exchangeId : null;
    },
    getPurchaseIdByRoleType: function (roleType) {
        var config = this.getRoleConfig(roleType);
        return config ? config.purchaseId : null;
    },
    getRoleTypeByPurchaseId: function (purchaseId) {
        purchaseId = parseInt(purchaseId);
        if (isNaN(purchaseId)) {
            return null;
        }

        var roleTypeList = this.getAllRoleTypes();
        for (var i = 0; i < roleTypeList.length; i++) {
            var roleType = roleTypeList[i];
            if (this.getPurchaseIdByRoleType(roleType) === purchaseId) {
                return roleType;
            }
        }
        return null;
    },
    getMapRoleTypeByRoleType: function (roleType) {
        var config = this.getRoleConfig(roleType);
        if (config && isFinite(config.mapRoleType)) {
            return config.mapRoleType;
        }
        roleType = parseInt(roleType);
        return isNaN(roleType) ? null : roleType;
    },
    getAvatarFallbackByRoleType: function (roleType) {
        var config = this.getRoleConfig(roleType);
        return config && config.avatarFallback ? config.avatarFallback : _defaultRoleInfo.avatarFallback;
    },
    isRolePurchaseRequired: function (roleType) {
        if (roleType === RoleType.STRANGER) {
            return false;
        }
        return !!this.getPurchaseIdByRoleType(roleType);
    },
    chooseRoleType: function (roleType) {
        cc.sys.localStorage.setItem("roleType", roleType);
    },
    getChoosenRoleType: function () {
        var roleType = cc.sys.localStorage.getItem("roleType");
        if (SafetyHelper.isEmpty(roleType)) {
            return RoleType.STRANGER;
        }
        roleType = Number(roleType);
        return this.getRoleConfig(roleType) ? roleType : RoleType.STRANGER;
    },
    isRoleUnlocked: function (roleType) {
        if (roleType === RoleType.STRANGER) {
            return true;
        }

        var exchangeId = this.getExchangeIdByRoleType(roleType);
        if (!exchangeId) {
            return !this.isRolePurchaseRequired(roleType);
        }
        return Medal.isExchanged(exchangeId);
    },
    getRoleInfo: function (roleType) {
        var config = this.getRoleConfig(roleType);
        if (!config) {
            return {
                name: this._getRoleStringValue(_defaultRoleInfo.nameStringId),
                des: this._getRoleStringValue(_defaultRoleInfo.infoDescriptionStringId),
                effect: this._getRoleStringValue(_defaultRoleInfo.infoEffectStringId)
            };
        }

        return {
            name: this._getRoleStringValue(config.nameStringId),
            des: this._getRoleTextFromSource(config.infoDescriptionSource, config.infoDescriptionStringId),
            effect: this._getRoleTextFromSource(config.infoEffectSource, config.infoEffectStringId)
        };
    }
};
